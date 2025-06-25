const bcrypt = require('bcrypt');
const Database = require('../database');
require('dotenv').config();

async function testAuth() {
    const db = new Database(process.env.DB_PATH);
    
    try {
        await db.connect();
        
        console.log('Testing database connection...');
        
        // Test user retrieval
        const user = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
        console.log('Admin user found:', user ? 'Yes' : 'No');
        
        if (user) {
            console.log('User ID:', user.id);
            console.log('Username:', user.username);
            console.log('Role:', user.role);
            
            // Test password verification
            const testPassword = 'BlakBox2025!';
            const isValid = await bcrypt.compare(testPassword, user.password_hash);
            console.log('Password verification:', isValid ? 'PASSED' : 'FAILED');
            
            // Test series
            const series = await db.all('SELECT * FROM series');
            console.log('Series count:', series.length);
            if (series.length > 0) {
                console.log('First series:', series[0].name);
            }
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await db.close();
    }
}

testAuth();