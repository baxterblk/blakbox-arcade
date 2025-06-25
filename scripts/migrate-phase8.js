const Database = require('../database');
require('dotenv').config();

async function migratePhase8() {
    const db = new Database(process.env.DB_PATH);
    
    try {
        await db.connect();
        
        console.log('Starting Phase 8 database migration...');
        
        // Add email column to users table
        try {
            await db.run('ALTER TABLE users ADD COLUMN email TEXT');
            console.log('✅ Added email column to users table');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('ℹ️  Email column already exists');
            } else {
                throw error;
            }
        }
        
        // Create save_states table
        await db.run(`
            CREATE TABLE IF NOT EXISTS save_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                game_id INTEGER NOT NULL,
                save_data TEXT NOT NULL,
                slot INTEGER DEFAULT 1,
                screenshot TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                UNIQUE(user_id, game_id, slot)
            )
        `);
        console.log('✅ Created save_states table');
        
        // Create indexes for save_states
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_save_states_user ON save_states(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_save_states_game ON save_states(game_id)',
            'CREATE INDEX IF NOT EXISTS idx_save_states_user_game ON save_states(user_id, game_id)'
        ];
        
        for (const sql of indexes) {
            await db.run(sql);
        }
        console.log('✅ Created save_states indexes');
        
        // Add updated_at trigger for save_states
        await db.run(`
            CREATE TRIGGER IF NOT EXISTS update_save_states_timestamp 
            AFTER UPDATE ON save_states
            BEGIN
                UPDATE save_states SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);
        console.log('✅ Created updated_at trigger');
        
        console.log('🎉 Phase 8 migration completed successfully!');
        
        // Show current table status
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        const gameCount = await db.get('SELECT COUNT(*) as count FROM games');
        console.log(`📊 Current database status:`);
        console.log(`   Users: ${userCount.count}`);
        console.log(`   Games: ${gameCount.count}`);
        console.log(`   Save states: 0 (new table)`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await db.close();
    }
}

migratePhase8().catch(console.error);