const Database = require('../database');
require('dotenv').config();

async function migrateUserEnabled() {
    console.log('Starting user enabled column migration...');
    
    const db = new Database(process.env.DB_PATH);
    
    try {
        await db.connect();
        
        // Check if enabled column already exists
        const tableInfo = await db.all("PRAGMA table_info(users)");
        const hasEnabledColumn = tableInfo.some(column => column.name === 'enabled');
        
        if (!hasEnabledColumn) {
            console.log('Adding enabled column to users table...');
            await db.run('ALTER TABLE users ADD COLUMN enabled INTEGER DEFAULT 1');
            console.log('✅ Enabled column added successfully');
        } else {
            console.log('✅ Enabled column already exists');
        }
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

migrateUserEnabled();