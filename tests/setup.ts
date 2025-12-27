// Global test setup
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Set required environment variables for tests (before any imports)
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_NAME = process.env.DB_NAME || 'osm_notes_api_test';
process.env.DB_USER = process.env.DB_USER || 'osm_notes_test_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'osm_notes_test_pass';
process.env.DB_PORT = process.env.DB_PORT || '5432';
// Disable Redis for tests (use in-memory rate limiting)
// Only set if not already set (allows individual tests to override)
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = '';
}
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// Note: Redis client reset is handled in individual test files
// before importing the app to ensure environment variables are set correctly

// Add any global test utilities or mocks here
