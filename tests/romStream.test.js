const request = require('supertest');
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Import modules
const Database = require('../database');

describe('ROM Streaming Integration Tests', () => {
    let app;
    let testDb;
    let testUser;
    let testGame;
    let authenticatedAgent;
    let testRomPath;
    let testRomContent;

    beforeAll(async () => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.DB_PATH = ':memory:'; // Use in-memory database for tests
        process.env.SESSION_SECRET = 'test-secret-key';

        // Import app after setting environment
        app = require('../app');

        // Initialize test database
        testDb = new Database(':memory:');
        await testDb.connect();
        await testDb.createTables();

        // Create test ROM file (simulating GoldenEye 007)
        testRomContent = Buffer.alloc(32 * 1024 * 1024); // 32MB test ROM
        // Fill with test pattern to make it identifiable
        for (let i = 0; i < testRomContent.length; i += 4) {
            testRomContent.writeUInt32BE(0xDEADBEEF + i, i);
        }

        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        testRomPath = path.join(uploadsDir, 'test-goldeneye007.n64');
        fs.writeFileSync(testRomPath, testRomContent);

        // Create test user
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash('testpass123', 10);
        
        const userResult = await testDb.run(
            'INSERT INTO users (username, email, password_hash, role, enabled, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            ['testuser', 'test@example.com', passwordHash, 'user', 1]
        );
        testUser = { id: userResult.lastID, username: 'testuser' };

        // Create test series
        const seriesResult = await testDb.run(
            'INSERT INTO series (name, description, sort_order) VALUES (?, ?, ?)',
            ['Nintendo 64', 'N64 Classic Games', 1]
        );

        // Create test game (GoldenEye 007)
        const gameResult = await testDb.run(`
            INSERT INTO games (title, description, system, filename, original_filename, file_size, series_id, uploaded_by, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            'GoldenEye 007',
            'Classic N64 FPS game featuring James Bond',
            'n64',
            'test-goldeneye007.n64',
            'GoldenEye 007 (USA).n64',
            testRomContent.length,
            seriesResult.lastID,
            testUser.id,
            1
        ]);
        
        testGame = {
            id: gameResult.lastID,
            title: 'GoldenEye 007',
            system: 'n64',
            filename: 'test-goldeneye007.n64'
        };

        // Create authenticated session
        authenticatedAgent = request.agent(app);
        await authenticatedAgent
            .post('/api/auth/login')
            .send({
                username: 'testuser',
                password: 'testpass123'
            })
            .expect(200);
    });

    afterAll(async () => {
        // Cleanup test files
        try {
            if (fs.existsSync(testRomPath)) {
                fs.unlinkSync(testRomPath);
            }
        } catch (error) {
            console.warn('Failed to cleanup test ROM file:', error.message);
        }

        // Close database
        if (testDb) {
            await testDb.close();
        }
    });

    describe('Authentication and Authorization', () => {
        test('should reject unauthenticated requests', async () => {
            const response = await request(app)
                .get(`/api/games/${testGame.id}/rom`)
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Authentication required');
        });

        test('should reject requests for non-existent games', async () => {
            const response = await authenticatedAgent
                .get('/api/games/99999/rom')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Game not found');
        });

        test('should reject requests for disabled games', async () => {
            // Disable the test game
            await testDb.run('UPDATE games SET enabled = 0 WHERE id = ?', [testGame.id]);

            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Game not found');

            // Re-enable for other tests
            await testDb.run('UPDATE games SET enabled = 1 WHERE id = ?', [testGame.id]);
        });
    });

    describe('Basic ROM Streaming', () => {
        test('should serve complete ROM file with correct headers', async () => {
            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(200);

            // Verify headers
            expect(response.headers['content-type']).toBe('application/x-n64-rom');
            expect(response.headers['content-length']).toBe(testRomContent.length.toString());
            expect(response.headers['cache-control']).toBe('public, max-age=3600');
            expect(response.headers['access-control-allow-origin']).toBe('*');

            // Verify content
            expect(response.body).toEqual(testRomContent);
        });

        test('should handle HEAD requests for ROM availability', async () => {
            const response = await authenticatedAgent
                .head(`/api/games/${testGame.id}/rom`)
                .expect(200);

            // Verify headers without body
            expect(response.headers['content-type']).toBe('application/x-n64-rom');
            expect(response.headers['content-length']).toBe(testRomContent.length.toString());
            expect(response.body).toEqual({});
        });
    });

    describe('Range Request Support', () => {
        test('should support byte range requests', async () => {
            const rangeStart = 1024;
            const rangeEnd = 4095;
            const expectedLength = rangeEnd - rangeStart + 1;

            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .set('Range', `bytes=${rangeStart}-${rangeEnd}`)
                .expect(206);

            // Verify partial content headers
            expect(response.headers['content-range']).toBe(`bytes ${rangeStart}-${rangeEnd}/${testRomContent.length}`);
            expect(response.headers['accept-ranges']).toBe('bytes');
            expect(response.headers['content-length']).toBe(expectedLength.toString());

            // Verify content matches expected range
            const expectedChunk = testRomContent.slice(rangeStart, rangeEnd + 1);
            expect(response.body).toEqual(expectedChunk);
        });

        test('should support open-ended range requests', async () => {
            const rangeStart = testRomContent.length - 1024;
            
            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .set('Range', `bytes=${rangeStart}-`)
                .expect(206);

            const expectedEnd = testRomContent.length - 1;
            const expectedLength = expectedEnd - rangeStart + 1;

            expect(response.headers['content-range']).toBe(`bytes ${rangeStart}-${expectedEnd}/${testRomContent.length}`);
            expect(response.headers['content-length']).toBe(expectedLength.toString());

            // Verify content
            const expectedChunk = testRomContent.slice(rangeStart);
            expect(response.body).toEqual(expectedChunk);
        });

        test('should handle multiple overlapping range requests', async () => {
            // Simulate EmulatorJS requesting different parts of the ROM
            const ranges = [
                { start: 0, end: 1023 },           // ROM header
                { start: 1024, end: 2047 },       // Game code start
                { start: 1000000, end: 1001023 }  // Game data chunk
            ];

            for (const range of ranges) {
                const response = await authenticatedAgent
                    .get(`/api/games/${testGame.id}/rom`)
                    .set('Range', `bytes=${range.start}-${range.end}`)
                    .expect(206);

                const expectedLength = range.end - range.start + 1;
                expect(response.headers['content-length']).toBe(expectedLength.toString());
                
                const expectedChunk = testRomContent.slice(range.start, range.end + 1);
                expect(response.body).toEqual(expectedChunk);
            }
        });
    });

    describe('Content Type Detection', () => {
        test('should detect N64 ROM content type', async () => {
            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/x-n64-rom');
        });

        test('should handle different ROM types', async () => {
            // Test different file extensions and their content types
            const romTypes = [
                { ext: '.nes', type: 'application/x-nintendo-rom' },
                { ext: '.snes', type: 'application/x-nintendo-rom' },
                { ext: '.gb', type: 'application/x-gameboy-rom' },
                { ext: '.gba', type: 'application/x-gameboy-rom' },
                { ext: '.gen', type: 'application/x-genesis-rom' },
                { ext: '.zip', type: 'application/zip' }
            ];

            for (const romType of romTypes) {
                // Create temporary game entry with different extension
                const tempGame = await testDb.run(`
                    INSERT INTO games (title, description, system, filename, original_filename, file_size, series_id, uploaded_by, enabled, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [
                    `Test Game ${romType.ext}`,
                    'Test ROM for content type detection',
                    'test',
                    `test-game${romType.ext}`,
                    `Test Game${romType.ext}`,
                    1024,
                    1,
                    testUser.id,
                    1
                ]);

                // Create temporary ROM file
                const tempRomPath = path.join(__dirname, '..', 'uploads', `test-game${romType.ext}`);
                fs.writeFileSync(tempRomPath, Buffer.alloc(1024));

                try {
                    const response = await authenticatedAgent
                        .head(`/api/games/${tempGame.lastID}/rom`)
                        .expect(200);

                    expect(response.headers['content-type']).toBe(romType.type);
                } finally {
                    // Cleanup
                    fs.unlinkSync(tempRomPath);
                    await testDb.run('DELETE FROM games WHERE id = ?', [tempGame.lastID]);
                }
            }
        });
    });

    describe('Play Session Recording', () => {
        test('should record play session when ROM is accessed', async () => {
            // Clear any existing play sessions
            await testDb.run('DELETE FROM play_sessions WHERE user_id = ? AND game_id = ?', [testUser.id, testGame.id]);

            await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(200);

            // Verify play session was recorded
            const playSession = await testDb.get(
                'SELECT * FROM play_sessions WHERE user_id = ? AND game_id = ? ORDER BY started_at DESC LIMIT 1',
                [testUser.id, testGame.id]
            );

            expect(playSession).toBeTruthy();
            expect(playSession.user_id).toBe(testUser.id);
            expect(playSession.game_id).toBe(testGame.id);
            expect(playSession.started_at).toBeTruthy();
        });

        test('should continue serving ROM even if session recording fails', async () => {
            // This test ensures the ROM streaming is resilient to database issues
            
            // Temporarily break the play_sessions table (simulate DB error)
            await testDb.run('DROP TABLE play_sessions');

            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(200);

            // ROM should still be served successfully
            expect(response.body).toEqual(testRomContent);

            // Recreate the table for other tests
            await testDb.run(`
                CREATE TABLE play_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    game_id INTEGER NOT NULL,
                    started_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
                )
            `);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing ROM files gracefully', async () => {
            // Create game entry with non-existent file
            const missingGame = await testDb.run(`
                INSERT INTO games (title, description, system, filename, original_filename, file_size, series_id, uploaded_by, enabled, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                'Missing ROM Game',
                'Game with missing ROM file',
                'nes',
                'non-existent-file.nes',
                'Missing Game.nes',
                1024,
                1,
                testUser.id,
                1
            ]);

            const response = await authenticatedAgent
                .get(`/api/games/${missingGame.lastID}/rom`)
                .expect(404);

            expect(response.body).toHaveProperty('error', 'ROM file not found on server');

            // Cleanup
            await testDb.run('DELETE FROM games WHERE id = ?', [missingGame.lastID]);
        });

        test('should handle invalid range requests', async () => {
            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .set('Range', 'bytes=invalid-range')
                .expect(200); // Falls back to full file on invalid range

            expect(response.body).toEqual(testRomContent);
        });
    });

    describe('GoldenEye 007 Specific Tests', () => {
        test('should stream GoldenEye 007 ROM with N64 core compatibility', async () => {
            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(200);

            // Verify game-specific properties
            expect(response.headers['content-type']).toBe('application/x-n64-rom');
            
            // Verify ROM is large enough for GoldenEye 007 (typically 12-32MB)
            expect(response.body.length).toBeGreaterThan(10 * 1024 * 1024); // > 10MB
            expect(response.body.length).toBeLessThan(100 * 1024 * 1024);   // < 100MB

            // Verify ROM has the test pattern we created
            const firstInt = response.body.readUInt32BE(0);
            expect(firstInt).toBe(0xDEADBEEF);
        });

        test('should support EmulatorJS typical access patterns for GoldenEye 007', async () => {
            // Simulate typical EmulatorJS loading sequence
            const accessPatterns = [
                { range: 'bytes=0-1023', description: 'ROM header check' },
                { range: 'bytes=0-65535', description: 'Initial ROM data load' },
                { range: 'bytes=1048576-1114111', description: 'Game code segment' },
                { range: 'bytes=' + (testRomContent.length - 1024) + '-', description: 'End of ROM check' }
            ];

            for (const pattern of accessPatterns) {
                const response = await authenticatedAgent
                    .get(`/api/games/${testGame.id}/rom`)
                    .set('Range', pattern.range)
                    .expect(206);

                expect(response.headers['accept-ranges']).toBe('bytes');
                expect(response.headers['content-type']).toBe('application/x-n64-rom');
                
                // Verify we get partial content
                expect(response.body.length).toBeLessThan(testRomContent.length);
            }
        });

        test('should handle concurrent ROM access (multiple players)', async () => {
            // Simulate multiple users accessing the same ROM simultaneously
            const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
                authenticatedAgent
                    .get(`/api/games/${testGame.id}/rom`)
                    .set('Range', `bytes=${i * 1024}-${(i + 1) * 1024 - 1}`)
            );

            const responses = await Promise.all(concurrentRequests);
            
            // All requests should succeed
            responses.forEach((response, index) => {
                expect(response.status).toBe(206);
                expect(response.body.length).toBe(1024);
                
                // Verify each got the correct chunk
                const expectedChunk = testRomContent.slice(index * 1024, (index + 1) * 1024);
                expect(response.body).toEqual(expectedChunk);
            });
        });
    });

    describe('Performance and Caching', () => {
        test('should set appropriate caching headers', async () => {
            const response = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(200);

            expect(response.headers['cache-control']).toBe('public, max-age=3600');
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });

        test('should handle If-Modified-Since requests (cache validation)', async () => {
            // Get initial response
            const firstResponse = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .expect(200);

            // Second request with If-Modified-Since should still return 200 
            // (we don't implement 304 Not Modified, but this tests the flow)
            const secondResponse = await authenticatedAgent
                .get(`/api/games/${testGame.id}/rom`)
                .set('If-Modified-Since', new Date().toUTCString())
                .expect(200);

            expect(secondResponse.body).toEqual(firstResponse.body);
        });
    });
});