/**
 * Unit tests for searchService
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as searchService from '../../../src/services/searchService';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('searchService', () => {
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

  describe('searchUsers', () => {
    it('should return users matching username query', async () => {
      const mockUsers = [
        {
          user_id: 12345,
          username: 'test_user',
          history_whole_open: 100,
          history_whole_closed: 50,
        },
        {
          user_id: 12346,
          username: 'test_user2',
          history_whole_open: 200,
          history_whole_closed: 100,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockUsers,
      });

      const result = await searchService.searchUsers('test');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining([expect.stringContaining('%test%')])
      );
      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe(12345);
      expect(result[0].username).toBe('test_user');
    });

    it('should return user when query matches exact user_id', async () => {
      const mockUser = {
        user_id: 12345,
        username: 'test_user',
        history_whole_open: 100,
        history_whole_closed: 50,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
      });

      const result = await searchService.searchUsers('12345');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(12345);
    });

    it('should return empty array when no users match', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await searchService.searchUsers('nonexistent');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(searchService.searchUsers('test')).rejects.toThrow(ApiError);
      await expect(searchService.searchUsers('test')).rejects.toThrow('Internal server error');
    });

    it('should limit results to 50 users', async () => {
      // Mock returns 50 users (service limits to 50)
      const mockUsers = Array.from({ length: 50 }, (_, i) => ({
        user_id: i + 1,
        username: `user_${i + 1}`,
        history_whole_open: 100,
        history_whole_closed: 50,
      }));

      mockQuery.mockResolvedValueOnce({
        rows: mockUsers,
      });

      const result = await searchService.searchUsers('user');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.any(Array)
      );
      expect(result.length).toBe(50);
    });

    it('should handle empty query string', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await searchService.searchUsers('');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });
  });

  describe('searchCountries', () => {
    it('should return countries matching country name query', async () => {
      const mockCountries = [
        {
          country_id: 42,
          country_name: 'Colombia',
          country_name_en: 'Colombia',
          country_name_es: 'Colombia',
          iso_alpha2: 'CO',
          history_whole_open: 1000,
          history_whole_closed: 800,
        },
        {
          country_id: 43,
          country_name: 'Colombia del Norte',
          country_name_en: 'North Colombia',
          country_name_es: 'Colombia del Norte',
          iso_alpha2: 'CN',
          history_whole_open: 500,
          history_whole_closed: 400,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockCountries,
      });

      const result = await searchService.searchCountries('Colombia');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining([expect.stringContaining('%Colombia%')])
      );
      expect(result).toHaveLength(2);
      expect(result[0].country_id).toBe(42);
      expect(result[0].country_name).toBe('Colombia');
    });

    it('should return country when query matches ISO code', async () => {
      const mockCountry = {
        country_id: 42,
        country_name: 'Colombia',
        country_name_en: 'Colombia',
        country_name_es: 'Colombia',
        iso_alpha2: 'CO',
        history_whole_open: 1000,
        history_whole_closed: 800,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCountry],
      });

      const result = await searchService.searchCountries('CO');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].iso_alpha2).toBe('CO');
    });

    it('should return country when query matches exact country_id', async () => {
      const mockCountry = {
        country_id: 42,
        country_name: 'Colombia',
        country_name_en: 'Colombia',
        country_name_es: 'Colombia',
        iso_alpha2: 'CO',
        history_whole_open: 1000,
        history_whole_closed: 800,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCountry],
      });

      const result = await searchService.searchCountries('42');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].country_id).toBe(42);
    });

    it('should return empty array when no countries match', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await searchService.searchCountries('nonexistent');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(searchService.searchCountries('test')).rejects.toThrow(ApiError);
      await expect(searchService.searchCountries('test')).rejects.toThrow('Internal server error');
    });

    it('should limit results to 50 countries', async () => {
      // Mock returns 50 countries (service limits to 50)
      const mockCountries = Array.from({ length: 50 }, (_, i) => ({
        country_id: i + 1,
        country_name: `Country ${i + 1}`,
        country_name_en: `Country ${i + 1}`,
        country_name_es: `País ${i + 1}`,
        iso_alpha2: `C${i + 1}`,
        history_whole_open: 1000,
        history_whole_closed: 800,
      }));

      mockQuery.mockResolvedValueOnce({
        rows: mockCountries,
      });

      const result = await searchService.searchCountries('Country');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.any(Array)
      );
      expect(result.length).toBe(50);
    });

    it('should handle empty query string', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await searchService.searchCountries('');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });

    it('should search in multiple name fields (name, name_en, name_es)', async () => {
      const mockCountry = {
        country_id: 42,
        country_name: 'Colombia',
        country_name_en: 'Colombia',
        country_name_es: 'Colombia',
        iso_alpha2: 'CO',
        history_whole_open: 1000,
        history_whole_closed: 800,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCountry],
      });

      await searchService.searchCountries('Colombia');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/country_name|country_name_en|country_name_es/),
        expect.arrayContaining([expect.stringContaining('%Colombia%')])
      );
    });
  });
});
