/**
 * Integration tests for database connection
 * These tests require a running PostgreSQL instance
 */

// Set test environment variables BEFORE importing database module
// This ensures the pool is created with correct credentials
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'osm_notes_api_test';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';

process.env.DB_HOST = dbHost;
process.env.DB_PORT = dbPort;
process.env.DB_NAME = dbName;
process.env.DB_USER = dbUser;
process.env.DB_PASSWORD = dbPassword;
process.env.DB_SSL = 'false';

// Now import database module after setting env vars
import {
  getDatabasePool,
  testConnection,
  closeDatabasePool,
  resetDatabasePool,
} from '../../src/config/database';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Reset any existing pool to ensure fresh connection with correct credentials
    await resetDatabasePool();

    // Ensure environment variables are set (already set above, but double-check)
    process.env.DB_HOST = dbHost;
    process.env.DB_PORT = dbPort;
    process.env.DB_NAME = dbName;
    process.env.DB_USER = dbUser;
    process.env.DB_PASSWORD = dbPassword;
    process.env.DB_SSL = 'false';
  });

  afterAll(async () => {
    await closeDatabasePool();
  });

  describe('Connection', () => {
    it('should connect to database successfully', async () => {
      await expect(testConnection()).resolves.not.toThrow();
    });

    it('should execute a simple query', async () => {
      const pool = getDatabasePool();
      const result = await pool.query('SELECT 1 as test');

      expect(result.rows).toHaveLength(1);
      expect((result.rows[0] as { test: number }).test).toBe(1);
    });

    it('should get PostgreSQL version', async () => {
      const pool = getDatabasePool();
      const result = await pool.query('SELECT version()');

      expect(result.rows).toHaveLength(1);
      expect((result.rows[0] as { version: string }).version).toContain('PostgreSQL');
    });
  });

  describe('Connection Pool', () => {
    it('should reuse connections from pool', async () => {
      const pool = getDatabasePool();
      const queries = Array(5)
        .fill(null)
        .map(() => pool.query('SELECT 1'));

      const results = await Promise.all(queries);
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.rows[0]).toEqual({ '?column?': 1 });
      });
    });

    it('should handle concurrent queries', async () => {
      const pool = getDatabasePool();
      const queries = Array(10)
        .fill(null)
        .map((_, i) => pool.query('SELECT $1 as value', [i]));

      const results = await Promise.all(queries);
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect((result.rows[0] as { value: number }).value).toBe(index);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid SQL gracefully', async () => {
      const pool = getDatabasePool();
      await expect(pool.query('SELECT * FROM nonexistent_table')).rejects.toThrow();
    });
  });
});
