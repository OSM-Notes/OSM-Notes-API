/**
 * Unit tests for analyticsService
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as analyticsService from '../../../src/services/analyticsService';
import { GlobalAnalytics } from '../../../src/types';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('analyticsService', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // Create mock query function
    mockQuery = jest.fn();

    // Create mock pool
    mockPool = {
      query: mockQuery,
    } as unknown as jest.Mocked<Pool>;

    // Mock getDatabasePool to return our mock pool
    (getDatabasePool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGlobalAnalytics', () => {
    it('should return global analytics data', async () => {
      const mockAnalytics: GlobalAnalytics = {
        dimension_global_id: 1,
        history_whole_open: 1000000,
        history_whole_closed: 800000,
        currently_open_count: 200000,
        avg_days_to_resolution: 5.5,
        resolution_rate: 80.0,
        notes_created_last_30_days: 5000,
        notes_resolved_last_30_days: 4500,
        active_users_count: 10000,
        notes_backlog_size: 50000,
        applications_used: [],
        top_countries: [],
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAnalytics],
        rowCount: 1,
      });

      const result = await analyticsService.getGlobalAnalytics();

      expect(result).toEqual(mockAnalytics);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('should handle null values correctly', async () => {
      const mockAnalytics: GlobalAnalytics = {
        dimension_global_id: 1,
        history_whole_open: 0,
        history_whole_closed: 0,
        currently_open_count: null,
        avg_days_to_resolution: null,
        resolution_rate: null,
        notes_created_last_30_days: null,
        notes_resolved_last_30_days: null,
        active_users_count: null,
        notes_backlog_size: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAnalytics],
        rowCount: 1,
      });

      const result = await analyticsService.getGlobalAnalytics();

      expect(result.currently_open_count).toBeNull();
      expect(result.avg_days_to_resolution).toBeNull();
      expect(result).toEqual(mockAnalytics);
    });

    it('should handle database errors and throw 500', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(analyticsService.getGlobalAnalytics()).rejects.toThrow();

      try {
        await analyticsService.getGlobalAnalytics();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(500);
        }
      }
    });

    it('should handle empty result set gracefully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // For global analytics, we might return default values or throw error
      // This depends on business logic - for now, we'll expect it to handle gracefully
      await expect(analyticsService.getGlobalAnalytics()).rejects.toThrow();
    });
  });
});
