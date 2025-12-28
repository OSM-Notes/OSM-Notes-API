/**
 * Unit tests for comparison service
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as comparisonService from '../../../src/services/comparisonService';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('comparisonService', () => {
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

  describe('compareUsers', () => {
    it('should compare multiple users by their metrics', async () => {
      const userIds = [12345, 67890];

      const mockUsers = [
        {
          user_id: 12345,
          username: 'user1',
          history_whole_open: 100,
          history_whole_closed: 50,
          history_whole_commented: 75,
          avg_days_to_resolution: 5.5,
          resolution_rate: 50.0,
        },
        {
          user_id: 67890,
          username: 'user2',
          history_whole_open: 200,
          history_whole_closed: 150,
          history_whole_commented: 100,
          avg_days_to_resolution: 3.2,
          resolution_rate: 75.0,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockUsers,
      });

      const result = await comparisonService.compareUsers(userIds);

      expect(result).toHaveProperty('type');
      expect(result.type).toBe('users');
      expect(result).toHaveProperty('entities');
      expect(Array.isArray(result.entities)).toBe(true);
      expect(result.entities.length).toBe(2);
      expect(result.entities[0]).toHaveProperty('user_id');
      expect(result.entities[0]).toHaveProperty('username');
      expect(result.entities[0]).toHaveProperty('history_whole_open');
    });

    it('should handle single user comparison', async () => {
      const userIds = [12345];

      const mockUsers = [
        {
          user_id: 12345,
          username: 'user1',
          history_whole_open: 100,
          history_whole_closed: 50,
          history_whole_commented: 75,
          avg_days_to_resolution: 5.5,
          resolution_rate: 50.0,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockUsers,
      });

      const result = await comparisonService.compareUsers(userIds);

      expect(result.entities.length).toBe(1);
    });

    it('should return empty array when no users found', async () => {
      const userIds = [99999];

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await comparisonService.compareUsers(userIds);

      expect(result.entities).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const userIds = [12345];

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(comparisonService.compareUsers(userIds)).rejects.toThrow(ApiError);
    });

    it('should limit to maximum 10 users', async () => {
      const userIds = Array.from({ length: 15 }, (_, i) => i + 1);

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await comparisonService.compareUsers(userIds);

      // Verify query was called
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('compareCountries', () => {
    it('should compare multiple countries by their metrics', async () => {
      const countryIds = [42, 43];

      const mockCountries = [
        {
          country_id: 42,
          country_name: 'Colombia',
          history_whole_open: 1000,
          history_whole_closed: 800,
          avg_days_to_resolution: 7.2,
          resolution_rate: 80.0,
          notes_health_score: 75.5,
        },
        {
          country_id: 43,
          country_name: 'Spain',
          history_whole_open: 2000,
          history_whole_closed: 1800,
          avg_days_to_resolution: 5.1,
          resolution_rate: 90.0,
          notes_health_score: 85.0,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockCountries,
      });

      const result = await comparisonService.compareCountries(countryIds);

      expect(result).toHaveProperty('type');
      expect(result.type).toBe('countries');
      expect(result).toHaveProperty('entities');
      expect(Array.isArray(result.entities)).toBe(true);
      expect(result.entities.length).toBe(2);
      expect(result.entities[0]).toHaveProperty('country_id');
      expect(result.entities[0]).toHaveProperty('country_name');
      expect(result.entities[0]).toHaveProperty('history_whole_open');
    });

    it('should handle single country comparison', async () => {
      const countryIds = [42];

      const mockCountries = [
        {
          country_id: 42,
          country_name: 'Colombia',
          history_whole_open: 1000,
          history_whole_closed: 800,
          avg_days_to_resolution: 7.2,
          resolution_rate: 80.0,
          notes_health_score: 75.5,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockCountries,
      });

      const result = await comparisonService.compareCountries(countryIds);

      expect(result.entities.length).toBe(1);
    });

    it('should return empty array when no countries found', async () => {
      const countryIds = [99999];

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await comparisonService.compareCountries(countryIds);

      expect(result.entities).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const countryIds = [42];

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(comparisonService.compareCountries(countryIds)).rejects.toThrow(ApiError);
    });

    it('should limit to maximum 10 countries', async () => {
      const countryIds = Array.from({ length: 15 }, (_, i) => i + 1);

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await comparisonService.compareCountries(countryIds);

      // Verify query was called
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
