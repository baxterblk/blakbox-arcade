const Database = require('../database');
require('dotenv').config();

async function addDemoContent() {
    const db = new Database(process.env.DB_PATH);
    
    try {
        await db.connect();
        
        console.log('Adding demo content...');
        
        // Add additional game series
        const series = [
            { name: 'NES Classics', description: 'Classic Nintendo Entertainment System games', sort_order: 1 },
            { name: 'SNES Collection', description: 'Super Nintendo Entertainment System favorites', sort_order: 2 },
            { name: 'Game Boy', description: 'Portable gaming classics', sort_order: 3 },
            { name: 'Homebrew Games', description: 'Community-created games and demos', sort_order: 4 }
        ];
        
        for (const serie of series) {
            // Check if series already exists
            const existing = await db.get('SELECT id FROM series WHERE name = ?', [serie.name]);
            if (!existing) {
                const result = await db.run(
                    'INSERT INTO series (name, description, sort_order) VALUES (?, ?, ?)',
                    [serie.name, serie.description, serie.sort_order]
                );
                console.log(`✅ Created series: ${serie.name} (ID: ${result.id})`);
            } else {
                console.log(`⚠️  Series already exists: ${serie.name}`);
            }
        }
        
        // Update the existing Classic Arcade series
        await db.run(
            'UPDATE series SET description = ?, sort_order = ? WHERE name = ?',
            ['Arcade classics from the golden age of gaming', 0, 'Classic Arcade']
        );
        console.log('✅ Updated Classic Arcade series');
        
        console.log('\n📊 Current series:');
        const allSeries = await db.all('SELECT * FROM series ORDER BY sort_order, name');
        allSeries.forEach(s => {
            console.log(`  - ${s.name} (Order: ${s.sort_order})`);
            if (s.description) {
                console.log(`    ${s.description}`);
            }
        });
        
        console.log('\n✨ Demo content added successfully!');
        console.log('You can now:');
        console.log('1. Login as admin (admin/BlakBox2025!)');
        console.log('2. Go to the Admin Panel');
        console.log('3. Upload ROM files to test the system');
        
    } catch (error) {
        console.error('❌ Error adding demo content:', error.message);
    } finally {
        await db.close();
    }
}

addDemoContent();