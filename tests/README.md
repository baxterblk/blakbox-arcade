# BlakBox Arcade - Test Suite

This directory contains Jest integration tests for the BlakBox Arcade game server.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx jest tests/romStream.test.js
```

## Test Files

### `romStream.test.js`
Comprehensive integration tests for ROM file streaming functionality, including:

- **Authentication & Authorization**: Verifies proper access control for ROM files
- **Basic ROM Streaming**: Tests complete file serving with correct headers
- **Range Request Support**: Validates HTTP byte-range requests for efficient streaming
- **Content Type Detection**: Ensures proper MIME types for different ROM formats
- **Play Session Recording**: Confirms user activity tracking
- **Error Handling**: Tests graceful handling of missing files and invalid requests
- **GoldenEye 007 Specific Tests**: Validates N64 ROM streaming for the specific game
- **Performance & Caching**: Tests caching headers and concurrent access

## Test Environment

Tests use an in-memory SQLite database and create temporary ROM files for testing. The test environment is completely isolated from the production database and file system.

## Prerequisites

Make sure you have the required dependencies installed:

```bash
npm install --save-dev jest supertest
```

## Test Data

Tests create a simulated 32MB GoldenEye 007 ROM file with a test pattern to validate streaming functionality without requiring actual copyrighted ROM files.