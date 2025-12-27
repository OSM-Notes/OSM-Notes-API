/**
 * Unit tests for userRankingsService
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as userRankingsService from '../../../src/services/userRankingsService';
import { ApiError } from '../../../src/middleware/errorHandler';
import { UserRankingMetric } from '../../../src/types';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('userRankingsService', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    } as unknown as jest.Mocked<Pool>;

    (getDatabasePool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRankings', () => {
    it('should return rankings ordered by metric in descending order', async () => {
      const mockRows = [
        {
          user_id: 12345,
          username: 'top_user',
          history_whole_closed: 500,
        },
        {
          user_id: 67890,
          username: 'second_user',
          history_whole_closed: 300,
        },
        {
          user_id: 11111,
          username: 'third_user',
          history_whole_closed: 200,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await userRankingsService.getUserRankings({
        metric: 'history_whole_closed',
        limit: 10,
      });

      expect(result).toHaveProperty('metric', 'history_whole_closed');
      expect(result).toHaveProperty('rankings');
      expect(result.rankings).toHaveLength(3);
      expect(result.rankings[0]).toEqual({
        rank: 1,
        user_id: 12345,
        username: 'top_user',
        value: 500,
      });
      expect(result.rankings[1]).toEqual({
        rank: 2,
        user_id: 67890,
        username: 'second_user',
        value: 300,
      });
      expect(result.rankings[2]).toEqual({
        rank: 3,
        user_id: 11111,
        username: 'third_user',
        value: 200,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const firstCall = mockQuery.mock.calls[0] as [string, unknown[]] | undefined;
      expect(firstCall).toBeDefined();
      const query = firstCall?.[0] ?? '';
      expect(query).toContain('history_whole_closed');
      expect(query).toContain('ORDER BY');
      expect(query).toContain('DESC');
      expect(query).toContain('LIMIT');
    });

    it('should filter by country when provided', async () => {
      const mockRows = [
        {
          user_id: 12345,
          username: 'top_user',
          history_whole_closed: 500,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await userRankingsService.getUserRankings({
        metric: 'history_whole_closed',
        country: 42,
        limit: 10,
      });

      expect(result).toHaveProperty('country', 42);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const firstCall = mockQuery.mock.calls[0] as [string, unknown[]] | undefined;
      expect(firstCall).toBeDefined();
      const query = firstCall?.[0] ?? '';
      const params = firstCall?.[1] ?? [];
      expect(query).toContain('dimension_country_id');
      expect(params).toContain(42);
    });

    it('should support different metrics', async () => {
      const metrics: UserRankingMetric[] = [
        'history_whole_open',
        'history_whole_closed',
        'history_whole_commented',
        'resolution_rate',
        'avg_days_to_resolution',
      ];

      for (const metric of metrics) {
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              user_id: 12345,
              username: 'test_user',
              [metric]: 100,
            },
          ],
        });

        const result = await userRankingsService.getUserRankings({
          metric,
          limit: 10,
        });

        expect(result.metric).toBe(metric);
        expect(result.rankings[0].value).toBe(100);

        const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1] as
          | [string, unknown[]]
          | undefined;
        expect(lastCall).toBeDefined();
        const query = lastCall?.[0] ?? '';
        expect(query).toContain(metric);
      }
    });

    it('should respect limit parameter', async () => {
      // Mock should return only 5 rows (limited by SQL LIMIT)
      const mockRows = Array.from({ length: 5 }, (_, i) => ({
        user_id: i + 1,
        username: `user_${i + 1}`,
        history_whole_closed: 100 - i,
      }));

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await userRankingsService.getUserRankings({
        metric: 'history_whole_closed',
        limit: 5,
      });

      expect(result.rankings).toHaveLength(5);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const firstCall = mockQuery.mock.calls[0] as [string, unknown[]] | undefined;
      expect(firstCall).toBeDefined();
      const params = firstCall?.[1] ?? [];
      expect(params).toContain(5);
    });

    it('should handle ascending order when specified', async () => {
      const mockRows = [
        {
          user_id: 11111,
          username: 'lowest_user',
          avg_days_to_resolution: 1,
        },
        {
          user_id: 22222,
          username: 'second_lowest',
          avg_days_to_resolution: 2,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await userRankingsService.getUserRankings({
        metric: 'avg_days_to_resolution',
        limit: 10,
        order: 'asc',
      });

      expect(result.order).toBe('asc');
      expect(result.rankings[0].value).toBe(1);
      expect(result.rankings[1].value).toBe(2);

      const firstCall = mockQuery.mock.calls[0] as [string, unknown[]] | undefined;
      expect(firstCall).toBeDefined();
      const query = firstCall?.[0] ?? '';
      expect(query).toContain('ORDER BY');
      expect(query).toContain('ASC');
    });

    it('should handle null values correctly', async () => {
      const mockRows = [
        {
          user_id: 12345,
          username: 'user_with_value',
          resolution_rate: 50.5,
        },
        {
          user_id: 67890,
          username: 'user_with_null',
          resolution_rate: null,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await userRankingsService.getUserRankings({
        metric: 'resolution_rate',
        limit: 10,
      });

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].value).toBe(50.5);
      expect(result.rankings[1].value).toBeNull();
    });

    it('should throw ApiError for invalid metric', async () => {
      // Use type assertion to test invalid metric
      const invalidMetric = 'invalid_metric' as unknown as UserRankingMetric;

      await expect(
        userRankingsService.getUserRankings({
          metric: invalidMetric,
          limit: 10,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        userRankingsService.getUserRankings({
          metric: invalidMetric,
          limit: 10,
        })
      ).rejects.toThrow('Invalid metric');
    });

    it('should throw ApiError for invalid limit', async () => {
      await expect(
        userRankingsService.getUserRankings({
          metric: 'history_whole_closed',
          limit: 0,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        userRankingsService.getUserRankings({
          metric: 'history_whole_closed',
          limit: 101,
        })
      ).rejects.toThrow(ApiError);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        userRankingsService.getUserRankings({
          metric: 'history_whole_closed',
          limit: 10,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        userRankingsService.getUserRankings({
          metric: 'history_whole_closed',
          limit: 10,
        })
      ).rejects.toThrow('Internal server error');
    });

    it('should return empty rankings when no users found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await userRankingsService.getUserRankings({
        metric: 'history_whole_closed',
        limit: 10,
      });

      expect(result.rankings).toHaveLength(0);
    });
  });
});
