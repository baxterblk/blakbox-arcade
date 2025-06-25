const bcrypt = require('bcrypt');
const Database = require('../database');
require('dotenv').config();

async function createAdminUser() {
    const db = new Database(process.env.DB_PATH);
    
    try {
        await db.connect();
        
        const adminUsername = 'admin';
        const adminPassword = 'BlakBox2025!'; // Default password - should be changed after first login
        
        // Check if admin user already exists
        const existingAdmin = await db.get('SELECT * FROM users WHERE username = ?', [adminUsername]);
        
        if (existingAdmin) {
            console.log('Admin user already exists. Username:', adminUsername);
            console.log('If you need to reset the password, please delete the user record and run this script again.');
            return;
        }
        
        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
        
        // Create the admin user
        const result = await db.run(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [adminUsername, passwordHash, 'admin']
        );
        
        console.log('✅ Admin user created successfully!');
        console.log('Username:', adminUsername);
        console.log('Password:', adminPassword);
        console.log('User ID:', result.id);
        console.log('');
        console.log('⚠️  IMPORTANT: Please change the default password after first login!');
        console.log('');
        console.log('You can now login at: http://your-server-ip/login');
        
        // Create a default series for testing
        const seriesResult = await db.run(
            'INSERT INTO series (name, description, sort_order) VALUES (?, ?, ?)',
            ['Classic Arcade', 'Classic arcade games from the golden age', 1]
        );
        
        console.log('✅ Default game series created: Classic Arcade (ID:', seriesResult.id, ')');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    } finally {
        await db.close();
    }
}

// Run the script
if (require.main === module) {
    createAdminUser();
}

module.exports = createAdminUser;