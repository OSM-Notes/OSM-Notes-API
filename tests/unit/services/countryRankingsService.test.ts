/**
 * Unit tests for countryRankingsService
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as countryRankingsService from '../../../src/services/countryRankingsService';
import { ApiError } from '../../../src/middleware/errorHandler';
import { CountryRankingMetric } from '../../../src/types';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('countryRankingsService', () => {
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

  describe('getCountryRankings', () => {
    it('should return rankings ordered by metric in descending order', async () => {
      const mockRows = [
        {
          country_id: 42,
          country_name: 'Colombia',
          history_whole_closed: 5000,
        },
        {
          country_id: 43,
          country_name: 'Venezuela',
          history_whole_closed: 3000,
        },
        {
          country_id: 44,
          country_name: 'Ecuador',
          history_whole_closed: 2000,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await countryRankingsService.getCountryRankings({
        metric: 'history_whole_closed',
        limit: 10,
      });

      expect(result).toHaveProperty('metric', 'history_whole_closed');
      expect(result).toHaveProperty('rankings');
      expect(result.rankings).toHaveLength(3);
      expect(result.rankings[0]).toEqual({
        rank: 1,
        country_id: 42,
        country_name: 'Colombia',
        value: 5000,
      });
      expect(result.rankings[1]).toEqual({
        rank: 2,
        country_id: 43,
        country_name: 'Venezuela',
        value: 3000,
      });
      expect(result.rankings[2]).toEqual({
        rank: 3,
        country_id: 44,
        country_name: 'Ecuador',
        value: 2000,
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

    it('should support different metrics', async () => {
      const metrics: CountryRankingMetric[] = [
        'history_whole_open',
        'history_whole_closed',
        'resolution_rate',
        'avg_days_to_resolution',
        'notes_health_score',
      ];

      for (const metric of metrics) {
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              country_id: 42,
              country_name: 'Colombia',
              [metric]: 100,
            },
          ],
        });

        const result = await countryRankingsService.getCountryRankings({
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
      const mockRows = Array.from({ length: 20 }, (_, i) => ({
        country_id: i + 1,
        country_name: `Country_${i + 1}`,
        history_whole_closed: 1000 - i * 10,
      }));

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await countryRankingsService.getCountryRankings({
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
          country_id: 44,
          country_name: 'Ecuador',
          avg_days_to_resolution: 1,
        },
        {
          country_id: 42,
          country_name: 'Colombia',
          avg_days_to_resolution: 2,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await countryRankingsService.getCountryRankings({
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

    it('should throw ApiError for invalid metric', async () => {
      // Use type assertion to test invalid metric
      const invalidMetric = 'invalid_metric' as unknown as CountryRankingMetric;

      await expect(
        countryRankingsService.getCountryRankings({
          metric: invalidMetric,
          limit: 10,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        countryRankingsService.getCountryRankings({
          metric: invalidMetric,
          limit: 10,
        })
      ).rejects.toThrow('Invalid metric');
    });

    it('should throw ApiError for invalid limit', async () => {
      await expect(
        countryRankingsService.getCountryRankings({
          metric: 'history_whole_closed',
          limit: 0,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        countryRankingsService.getCountryRankings({
          metric: 'history_whole_closed',
          limit: 101,
        })
      ).rejects.toThrow(ApiError);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        countryRankingsService.getCountryRankings({
          metric: 'history_whole_closed',
          limit: 10,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        countryRankingsService.getCountryRankings({
          metric: 'history_whole_closed',
          limit: 10,
        })
      ).rejects.toThrow('Internal server error');
    });

    it('should return empty rankings when no countries found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await countryRankingsService.getCountryRankings({
        metric: 'history_whole_closed',
        limit: 10,
      });

      expect(result.rankings).toHaveLength(0);
    });
  });
});
