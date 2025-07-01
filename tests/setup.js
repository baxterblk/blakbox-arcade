// Jest setup file for integration tests
const path = require('path');

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-key-12345';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test teardown
afterAll(async () => {
    // Allow time for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
});