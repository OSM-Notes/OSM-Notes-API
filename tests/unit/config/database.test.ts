/**
 * Unit tests for database configuration
 */

import { getDatabasePool, closeDatabasePool, getPoolStats } from '../../../src/config/database';

describe('Database Configuration', () => {
  afterEach(async () => {
    await closeDatabasePool();
  });

  describe('getDatabasePool', () => {
    it('should create a database pool', () => {
      const pool = getDatabasePool();
      expect(pool).toBeDefined();
    });

    it('should return the same pool instance on subsequent calls', () => {
      const pool1 = getDatabasePool();
      const pool2 = getDatabasePool();

      expect(pool1).toBe(pool2);
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', () => {
      getDatabasePool(); // Ensure pool exists
      const stats = getPoolStats();
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('idleCount');
      expect(stats).toHaveProperty('waitingCount');
    });
  });

  describe('closeDatabasePool', () => {
    it('should close the database pool without errors', async () => {
      getDatabasePool(); // Create pool first
      await expect(closeDatabasePool()).resolves.not.toThrow();
    });
  });
});
