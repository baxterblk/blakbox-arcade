const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { sendPasswordResetEmail } = require("./email");
const { detectGameMetadata } = require("./gameMetadata");
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const Database = require('./database');
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database(process.env.DB_PATH);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: function (req, file, cb) {
        const allowedExt = [".nes", ".snes", ".smc", ".sfc", ".gb", ".gbc", ".gba", ".n64", ".z64", ".gen", ".md", ".smd", ".zip", ".iso"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExt.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type"));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'web', 'static')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
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

// Registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'views', 'register.html'));
});

// Games page
app.get('/games', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'web', 'views', 'games.html'));
});

// Admin page
app.get('/admin', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    if (req.session.userRole !== 'admin') {
        return res.redirect('/games');
    }
    res.sendFile(path.join(__dirname, 'web', 'views', 'admin.html'));
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

        // Check if user is enabled
        if (user.enabled === 0) {
            return res.status(403).json({ error: 'Account disabled. Please contact an administrator.' });
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

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters, letters, numbers, and underscores only' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        
        if (email) {
            const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            if (existingEmail) {
                return res.status(409).json({ error: 'Email already registered' });
            }
        }
        
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const result = await db.run(
            'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [username, email || null, passwordHash, 'user']
        );
        
        req.session.userId = result.lastID;
        req.session.username = username;
        req.session.userRole = 'user';
        
        res.status(201).json({ 
            success: true, 
            user: { 
                id: result.lastID, 
                username: username, 
                role: 'user' 
            } 
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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

// **CRITICAL: ROM Streaming Route - This was missing!**
app.get('/api/games/:gameId/rom', requireAuth, async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.session.userId;
        
        // Get game information
        const game = await db.get('SELECT * FROM games WHERE id = ? AND enabled = 1', [gameId]);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        // Build full file path
        const filePath = path.join(__dirname, 'uploads', game.filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('ROM file not found:', filePath);
            return res.status(404).json({ error: 'ROM file not found on server' });
        }
        
        // Record play session
        try {
            await db.run(
                'INSERT INTO play_sessions (user_id, game_id, started_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [userId, gameId]
            );
        } catch (sessionError) {
            console.log('Could not record play session:', sessionError);
            // Continue serving the file even if session recording fails
        }
        
        // Get file stats
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        // Set appropriate headers for ROM file
        const ext = path.extname(game.filename).toLowerCase();
        let contentType = 'application/octet-stream';
        
        // Set more specific content types for better browser handling
        if (['.nes', '.snes', '.smc', '.sfc'].includes(ext)) {
            contentType = 'application/x-nintendo-rom';
        } else if (['.gb', '.gbc', '.gba'].includes(ext)) {
            contentType = 'application/x-gameboy-rom';
        } else if (['.n64', '.z64'].includes(ext)) {
            contentType = 'application/x-n64-rom';
        } else if (['.gen', '.md', '.smd'].includes(ext)) {
            contentType = 'application/x-genesis-rom';
        } else if (ext === '.zip') {
            contentType = 'application/zip';
        }
        
        // Handle range requests for large files
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            });
            
            file.pipe(res);
        } else {
            // Send entire file
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            });
            
            fs.createReadStream(filePath).pipe(res);
        }
        
    } catch (error) {
        console.error('ROM streaming error:', error);
        res.status(500).json({ error: 'Failed to stream ROM file' });
    }
});

// Record play session
app.post('/api/play-session', requireAuth, async (req, res) => {
    try {
        const { gameId } = req.body;
        const userId = req.session.userId;
        
        if (!gameId) {
            return res.status(400).json({ error: 'Game ID required' });
        }
        
        // Verify game exists
        const game = await db.get('SELECT * FROM games WHERE id = ? AND enabled = 1', [gameId]);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        await db.run(
            'INSERT INTO play_sessions (user_id, game_id, started_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [userId, gameId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Play session error:', error);
        res.status(500).json({ error: 'Failed to record play session' });
    }
});

// Get all series (for admin)
app.get("/api/series", requireAuth, async (req, res) => {
    try {
        const series = await db.all('SELECT * FROM series ORDER BY sort_order, name');
        res.json(series);
    } catch (error) {
        console.error('Series API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save game state
app.post('/api/games/:gameId/save', requireAuth, async (req, res) => {
    try {
        const { gameId } = req.params;
        const { saveData, slot = 1, screenshot = null } = req.body;
        const userId = req.session.userId;
        
        if (!saveData) {
            return res.status(400).json({ error: 'Save data required' });
        }
        
        if (slot < 1 || slot > 3) {
            return res.status(400).json({ error: 'Slot must be between 1 and 3' });
        }
        
        // Verify game exists and user has access
        const game = await db.get('SELECT * FROM games WHERE id = ? AND enabled = 1', [gameId]);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        // Upsert save state
        await db.run(`
            INSERT OR REPLACE INTO save_states (user_id, game_id, save_data, slot, screenshot, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [userId, gameId, saveData, slot, screenshot]);
        
        res.json({ success: true, message: 'Game saved successfully', slot: slot });
    } catch (error) {
        console.error('Save state error:', error);
        res.status(500).json({ error: 'Failed to save game state' });
    }
});

// Get user's save states for a game
app.get('/api/games/:gameId/saves', requireAuth, async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.session.userId;
        
        const saves = await db.all(`
            SELECT slot, screenshot, created_at, updated_at
            FROM save_states 
            WHERE user_id = ? AND game_id = ?
            ORDER BY slot
        `, [userId, gameId]);
        
        res.json(saves);
    } catch (error) {
        console.error('Load saves error:', error);
        res.status(500).json({ error: 'Failed to load save states' });
    }
});

// Load specific save state
app.get('/api/games/:gameId/load/:slot', requireAuth, async (req, res) => {
    try {
        const { gameId, slot } = req.params;
        const userId = req.session.userId;
        
        const save = await db.get(`
            SELECT save_data, screenshot, updated_at
            FROM save_states 
            WHERE user_id = ? AND game_id = ? AND slot = ?
        `, [userId, gameId, slot]);
        
        if (!save) {
            return res.status(404).json({ error: 'Save state not found' });
        }
        
        res.json(save);
    } catch (error) {
        console.error('Load save error:', error);
        res.status(500).json({ error: 'Failed to load save state' });
    }
});

// Delete save state
app.delete('/api/games/:gameId/save/:slot', requireAuth, async (req, res) => {
    try {
        const { gameId, slot } = req.params;
        const userId = req.session.userId;
        
        const result = await db.run(`
            DELETE FROM save_states 
            WHERE user_id = ? AND game_id = ? AND slot = ?
        `, [userId, gameId, slot]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Save state not found' });
        }
        
        res.json({ success: true, message: 'Save state deleted successfully' });
    } catch (error) {
        console.error('Delete save error:', error);
        res.status(500).json({ error: 'Failed to delete save state' });
    }
});

// Admin API Routes

// Admin Stats Route
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
        const userCount = await db.get("SELECT COUNT(*) as count FROM users");
        const gameCount = await db.get("SELECT COUNT(*) as count FROM games");
        const seriesCount = await db.get("SELECT COUNT(*) as count FROM series");
        
        res.json({
            users: userCount.count,
            games: gameCount.count,
            series: seriesCount.count
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

// Admin Series Route (GET)
app.get("/api/admin/series", requireAdmin, async (req, res) => {
    try {
        const series = await db.all("SELECT * FROM series ORDER BY sort_order ASC, name ASC");
        res.json(series);
    } catch (error) {
        console.error("Error fetching admin series:", error);
        res.status(500).json({ error: "Failed to fetch series" });
    }
});

// Create new series (admin only)
app.post("/api/admin/series", requireAdmin, async (req, res) => {
    try {
        const { name, description, sort_order } = req.body;
        
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ error: "Series name is required" });
        }
        
        // Check if series exists
        const existing = await db.get("SELECT id FROM series WHERE name = ?", [name]);
        if (existing) {
            return res.status(400).json({ error: "Series already exists" });
        }
        
        await db.run(
            "INSERT INTO series (name, description, sort_order) VALUES (?, ?, ?)",
            [name.trim(), description || "", sort_order || 0]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("Create series error:", error);
        res.status(500).json({ error: "Failed to create series" });
    }
});

// Admin Games Route
app.get("/api/admin/games", requireAdmin, async (req, res) => {
    try {
        const games = await db.all(`
            SELECT g.*, s.name as series_name, u.username as uploaded_by_username
            FROM games g
            LEFT JOIN series s ON g.series_id = s.id
            LEFT JOIN users u ON g.uploaded_by = u.id
            ORDER BY g.created_at DESC
        `);
        res.json(games);
    } catch (error) {
        console.error("Error fetching admin games:", error);
        res.status(500).json({ error: "Failed to fetch games" });
    }
});

// File upload route for games
app.post("/api/admin/games/upload", requireAdmin, upload.single('gameFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        
        const { title, description, series_id, system } = req.body;
        
        if (!title || !series_id) {
            return res.status(400).json({ error: "Title and series are required" });
        }
        
        // Auto-detect metadata if not provided
        const metadata = detectGameMetadata(req.file.originalname);
        
        const gameData = {
            title: title || metadata.name,
            description: description || metadata.description,
            system: system || metadata.system.toLowerCase(),
            filename: req.file.filename,
            original_filename: req.file.originalname,
            file_size: req.file.size,
            series_id: parseInt(series_id),
            uploaded_by: req.session.userId,
            enabled: 1
        };
        
        const result = await db.run(`
            INSERT INTO games (title, description, system, filename, original_filename, file_size, series_id, uploaded_by, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            gameData.title,
            gameData.description,
            gameData.system,
            gameData.filename,
            gameData.original_filename,
            gameData.file_size,
            gameData.series_id,
            gameData.uploaded_by,
            gameData.enabled
        ]);
        
        res.json({ 
            success: true, 
            message: "Game uploaded successfully",
            gameId: result.lastID 
        });
        
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to upload game" });
    }
});

// Get all users with stats
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = await db.all(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.role,
                u.created_at,
                u.enabled,
                COUNT(DISTINCT ps.id) as games_played,
                COUNT(DISTINCT ss.id) as total_saves
            FROM users u
            LEFT JOIN play_sessions ps ON u.id = ps.user_id
            LEFT JOIN save_states ss ON u.id = ss.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        // Get stats for dashboard
        const totalUsers = users.length;
        const activeToday = await db.get(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM play_sessions 
            WHERE date(started_at) = date('now')
        `);
        const totalSaves = await db.get('SELECT COUNT(*) as count FROM save_states');
        const totalSessions = await db.get('SELECT COUNT(*) as count FROM play_sessions');

        res.json({
            users: users,
            stats: {
                totalUsers: totalUsers,
                activeToday: activeToday.count || 0,
                totalSaves: totalSaves.count || 0,
                totalSessions: totalSessions.count || 0
            }
        });
    } catch (error) {
        console.error('Users API error:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// Create new user (admin only)
app.post("/api/admin/users/create", requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        // Validate input
        if (!username || !password || username.length < 3 || password.length < 6) {
            return res.status(400).json({ error: "Invalid input" });
        }
        
        // Check if username exists
        const existing = await db.get("SELECT id FROM users WHERE username = ?", [username]);
        if (existing) {
            return res.status(400).json({ error: "Username already exists" });
        }
        
        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 10);
        await db.run(
            "INSERT INTO users (username, email, password_hash, role, enabled) VALUES (?, ?, ?, ?, ?)",
            [username, email || null, passwordHash, role || "user", 1]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Toggle user enabled/disabled
app.post('/api/admin/users/:userId/toggle', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get current status
        const user = await db.get('SELECT enabled FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const newStatus = user.enabled ? 0 : 1;
        await db.run('UPDATE users SET enabled = ? WHERE id = ?', [newStatus, userId]);
        
        res.json({ 
            success: true, 
            message: `User ${newStatus ? 'enabled' : 'disabled'} successfully`,
            enabled: newStatus
        });
    } catch (error) {
        console.error('Toggle user error:', error);
        res.status(500).json({ error: 'Failed to toggle user status' });
    }
});

// Reset user password
app.post('/api/admin/users/:userId/reset-password', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await db.get('SELECT username, email FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
        
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        
        // Send email if user has email address
        if (user.email) {
            try {
                await sendPasswordResetEmail(user.email, user.username, tempPassword);
                console.log("Password reset email sent to:", user.email);
            } catch (emailError) {
                console.error("Failed to send email:", emailError);
                // Continue even if email fails
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Password reset successfully',
            tempPassword: tempPassword,
            username: user.username
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Delete user and all their data
app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Prevent admin from deleting themselves
        if (parseInt(userId) === req.session.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        const user = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Delete user (CASCADE will handle save_states and play_sessions)
        const result = await db.run('DELETE FROM users WHERE id = ?', [userId]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            message: `User ${user.username} and all associated data deleted successfully`
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
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