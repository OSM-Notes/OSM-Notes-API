/**
 * Unit tests for trends service
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as trendsService from '../../../src/services/trendsService';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('trendsService', () => {
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

  describe('getTrends', () => {
    it('should return trends for users', async () => {
      const params = {
        type: 'users' as const,
        user_id: 12345,
      };

      const mockUser = {
        user_id: 12345,
        username: 'user1',
        history_2020_open: 10,
        history_2020_closed: 5,
        history_2021_open: 20,
        history_2021_closed: 15,
        history_2022_open: 30,
        history_2022_closed: 25,
        working_hours_of_week_opening: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
      });

      const result = await trendsService.getTrends(params);

      expect(result).toHaveProperty('type');
      expect(result.type).toBe('users');
      expect(result).toHaveProperty('entity_id');
      if (result.entity_id !== undefined) {
        expect(result.entity_id).toBe(12345);
      }
      expect(result).toHaveProperty('trends');
      expect(Array.isArray(result.trends)).toBe(true);
    });

    it('should return trends for countries', async () => {
      const params = {
        type: 'countries' as const,
        country_id: 42,
      };

      const mockCountry = {
        country_id: 42,
        country_name: 'Colombia',
        history_2020_open: 1000,
        history_2020_closed: 800,
        history_2021_open: 1200,
        history_2021_closed: 1000,
        history_2022_open: 1500,
        history_2022_closed: 1300,
        working_hours_of_week_opening: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCountry],
      });

      const result = await trendsService.getTrends(params);

      expect(result).toHaveProperty('type');
      expect(result.type).toBe('countries');
      expect(result).toHaveProperty('entity_id');
      expect(result.entity_id).toBe(42);
      expect(result).toHaveProperty('trends');
    });

    it('should return global trends when no entity specified', async () => {
      const params = {
        type: 'global' as const,
      };

      const mockGlobal = {
        history_2020_open: 100000,
        history_2020_closed: 80000,
        history_2021_open: 120000,
        history_2021_closed: 100000,
        history_2022_open: 150000,
        history_2022_closed: 130000,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockGlobal],
      });

      const result = await trendsService.getTrends(params);

      expect(result).toHaveProperty('type');
      expect(result.type).toBe('global');
      expect(result).toHaveProperty('trends');
    });

    it('should handle empty yearly columns gracefully', async () => {
      const params = {
        type: 'users' as const,
        user_id: 12345,
      };

      const mockUser = {
        user_id: 12345,
        username: 'user1',
        working_hours_of_week_opening: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
      });

      const result = await trendsService.getTrends(params);

      expect(result).toHaveProperty('trends');
      expect(Array.isArray(result.trends)).toBe(true);
    });

    it('should handle database errors', async () => {
      const params = {
        type: 'users' as const,
        user_id: 12345,
      };

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(trendsService.getTrends(params)).rejects.toThrow(ApiError);
    });

    it('should return 404 when user not found', async () => {
      const params = {
        type: 'users' as const,
        user_id: 99999,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(trendsService.getTrends(params)).rejects.toThrow(ApiError);
    });

    it('should return 404 when country not found', async () => {
      const params = {
        type: 'countries' as const,
        country_id: 99999,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(trendsService.getTrends(params)).rejects.toThrow(ApiError);
    });

    it('should build trends from per-year open/closed columns', async () => {
      const params = {
        type: 'users' as const,
        user_id: 12345,
      };

      const mockUser = {
        user_id: 12345,
        username: 'user1',
        history_2020_open: 10,
        history_2020_closed: 5,
        history_2021_open: 20,
        history_2021_closed: 15,
        working_hours_of_week_opening: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
      });

      const result = await trendsService.getTrends(params);

      expect(result.trends.length).toBeGreaterThan(0);
      const trend = result.trends[0];
      expect(trend).toHaveProperty('year');
      expect(trend).toHaveProperty('open');
      expect(trend).toHaveProperty('closed');
    });

    it('should include working_hours when available', async () => {
      const params = {
        type: 'users' as const,
        user_id: 12345,
      };

      const mockUser = {
        user_id: 12345,
        username: 'user1',
        history_2020_open: 10,
        history_2020_closed: 5,
        working_hours_of_week_opening: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
      });

      const result = await trendsService.getTrends(params);

      expect(result).toHaveProperty('working_hours');
      if (result.working_hours) {
        expect(Array.isArray(result.working_hours)).toBe(true);
      }
    });
  });
});
