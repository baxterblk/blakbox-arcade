const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database(process.env.DB_PATH);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'web', 'static')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
}

// Routes

// Home page - redirect to games
app.get('/', (req, res) => {
    res.redirect('/games');
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'views', 'login.html'));
});

// Games page
app.get('/games', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'web', 'views', 'games.html'));
});

// API Routes

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userRole = user.role;

        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role 
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true });
    });
});

// Get current user
app.get('/api/auth/user', (req, res) => {
    if (req.session.userId) {
        res.json({
            id: req.session.userId,
            username: req.session.username,
            role: req.session.userRole
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Get games by series
app.get('/api/games', requireAuth, async (req, res) => {
    try {
        const series = await db.all(`
            SELECT s.*, COUNT(g.id) as game_count 
            FROM series s 
            LEFT JOIN games g ON s.id = g.series_id AND g.enabled = 1
            GROUP BY s.id 
            ORDER BY s.sort_order, s.name
        `);

        const gamesData = [];
        for (const serie of series) {
            const games = await db.all(`
                SELECT g.*, u.username as uploaded_by_name
                FROM games g
                LEFT JOIN users u ON g.uploaded_by = u.id
                WHERE g.series_id = ? AND g.enabled = 1
                ORDER BY g.title
            `, [serie.id]);

            gamesData.push({
                ...serie,
                games: games
            });
        }

        res.json(gamesData);
    } catch (error) {
        console.error('Games API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all series (for admin)
app.get('/api/series', requireAdmin, async (req, res) => {
    try {
        const series = await db.all('SELECT * FROM series ORDER BY sort_order, name');
        res.json(series);
    } catch (error) {
        console.error('Series API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function startServer() {
    try {
        await db.connect();
        await db.createTables();
        
        app.listen(PORT, () => {
            console.log(`BlakBox Game Server running on port ${PORT}`);
            console.log(`Access the application at: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully');
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully');
    await db.close();
    process.exit(0);
});

startServer();