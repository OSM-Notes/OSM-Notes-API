/**
 * Unit tests for hashtag service
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as hashtagService from '../../../src/services/hashtagService';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('hashtagService', () => {
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

  describe('getHashtags', () => {
    it('should return list of hashtags with counts', async () => {
      const mockHashtags = [
        {
          hashtag: 'fixme',
          count: '5',
        },
        {
          hashtag: 'vandalism',
          count: '3',
        },
      ];

      const mockCount = [{ count: '2' }];

      mockQuery.mockResolvedValueOnce({
        rows: mockHashtags,
      });
      mockQuery.mockResolvedValueOnce({
        rows: mockCount,
      });

      const result = await hashtagService.getHashtags({});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // Verify hashtags are returned
      const fixmeHashtag = result.data.find((h) => h.hashtag === 'fixme');
      expect(fixmeHashtag).toBeDefined();
      if (fixmeHashtag) {
        expect(fixmeHashtag.count).toBeGreaterThan(0);
      }
    });

    it('should support pagination', async () => {
      const mockHashtags: unknown[] = [];
      const mockCount = [{ count: '0' }];

      mockQuery.mockResolvedValueOnce({
        rows: mockHashtags,
      });
      mockQuery.mockResolvedValueOnce({
        rows: mockCount,
      });

      const result = await hashtagService.getHashtags({
        page: 2,
        limit: 10,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    it('should support sorting by count (desc)', async () => {
      const mockHashtags = [
        {
          hashtag: 'fixme',
          count: '5',
        },
        {
          hashtag: 'vandalism',
          count: '3',
        },
      ];

      const mockCount = [{ count: '2' }];

      mockQuery.mockResolvedValueOnce({
        rows: mockHashtags,
      });
      mockQuery.mockResolvedValueOnce({
        rows: mockCount,
      });

      const result = await hashtagService.getHashtags({
        order: 'desc',
      });

      expect(result.data.length).toBeGreaterThan(0);
      // Verify sorting (most common first)
      if (result.data.length > 1) {
        expect(result.data[0].count).toBeGreaterThanOrEqual(result.data[1].count);
      }
    });

    it('should handle empty hashtags gracefully', async () => {
      const mockHashtags: unknown[] = [];
      const mockCount = [{ count: '0' }];

      mockQuery.mockResolvedValueOnce({
        rows: mockHashtags,
      });
      mockQuery.mockResolvedValueOnce({
        rows: mockCount,
      });

      const result = await hashtagService.getHashtags({});

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(hashtagService.getHashtags({})).rejects.toThrow(ApiError);
    });
  });

  describe('getHashtagDetails', () => {
    it('should return hashtag details with statistics', async () => {
      const hashtag = 'fixme';

      const mockUsers = [
        {
          user_id: 1,
          username: 'user1',
          history_whole_open: 10,
          history_whole_closed: 5,
        },
      ];

      const mockCountries = [
        {
          country_id: 1,
          country_name: 'Country1',
          history_whole_open: 20,
          history_whole_closed: 10,
        },
      ];

      const mockUsersCount = [{ count: '1' }];
      const mockCountriesCount = [{ count: '1' }];

      // Mock 4 queries: users, countries, usersCount, countriesCount
      mockQuery
        .mockResolvedValueOnce({
          rows: mockUsers,
        })
        .mockResolvedValueOnce({
          rows: mockCountries,
        })
        .mockResolvedValueOnce({
          rows: mockUsersCount,
        })
        .mockResolvedValueOnce({
          rows: mockCountriesCount,
        });

      const result = await hashtagService.getHashtagDetails(hashtag);

      expect(result).toHaveProperty('hashtag');
      expect(result.hashtag).toBe(hashtag);
      expect(result).toHaveProperty('users_count');
      expect(result).toHaveProperty('countries_count');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('countries');
      expect(Array.isArray(result.users)).toBe(true);
      expect(Array.isArray(result.countries)).toBe(true);
      expect(result.users_count).toBe(1);
      expect(result.countries_count).toBe(1);
    });

    it('should return empty arrays when hashtag not found', async () => {
      const hashtag = 'nonexistent';

      const mockUsers: unknown[] = [];
      const mockCountries: unknown[] = [];
      const mockUsersCount = [{ count: '0' }];
      const mockCountriesCount = [{ count: '0' }];

      // Mock 4 queries: users, countries, usersCount, countriesCount
      mockQuery
        .mockResolvedValueOnce({
          rows: mockUsers,
        })
        .mockResolvedValueOnce({
          rows: mockCountries,
        })
        .mockResolvedValueOnce({
          rows: mockUsersCount,
        })
        .mockResolvedValueOnce({
          rows: mockCountriesCount,
        });

      const result = await hashtagService.getHashtagDetails(hashtag);

      expect(result.hashtag).toBe(hashtag);
      expect(result.users_count).toBe(0);
      expect(result.countries_count).toBe(0);
      expect(result.users).toHaveLength(0);
      expect(result.countries).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const hashtag = 'fixme';

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(hashtagService.getHashtagDetails(hashtag)).rejects.toThrow(ApiError);
    });

    it('should limit results for users and countries', async () => {
      const hashtag = 'fixme';

      // Create mock data with more than default limit
      const mockUsers = Array.from({ length: 50 }, (_, i) => ({
        user_id: i + 1,
        username: `user${i + 1}`,
        history_whole_open: 10,
        history_whole_closed: 5,
      }));

      const mockCountries: unknown[] = [];
      const mockUsersCount = [{ count: '100' }]; // Total count is 100
      const mockCountriesCount = [{ count: '0' }];

      // Mock 4 queries: users, countries, usersCount, countriesCount
      mockQuery
        .mockResolvedValueOnce({
          rows: mockUsers,
        })
        .mockResolvedValueOnce({
          rows: mockCountries,
        })
        .mockResolvedValueOnce({
          rows: mockUsersCount,
        })
        .mockResolvedValueOnce({
          rows: mockCountriesCount,
        });

      const result = await hashtagService.getHashtagDetails(hashtag);

      expect(result.users.length).toBeLessThanOrEqual(50); // Default limit
      expect(result.users_count).toBe(100); // Total count
      expect(result.countries.length).toBeLessThanOrEqual(50);
    });
  });
});
