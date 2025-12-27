/**
 * Unit tests for countryService
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as countryService from '../../../src/services/countryService';
import { CountryProfile } from '../../../src/types';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('countryService', () => {
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

  describe('getCountryProfile', () => {
    it('should return a valid country profile when country exists', async () => {
      const mockCountry: CountryProfile = {
        dimension_country_id: 45,
        country_id: 42,
        country_name: 'Colombia',
        country_name_en: 'Colombia',
        country_name_es: 'Colombia',
        iso_alpha2: 'CO',
        history_whole_open: 1000,
        history_whole_closed: 800,
        avg_days_to_resolution: 7.2,
        resolution_rate: 80.0,
        notes_health_score: 75.5,
        new_vs_resolved_ratio: 1.2,
        notes_backlog_size: 50,
        notes_created_last_30_days: 100,
        notes_resolved_last_30_days: 80,
        users_open_notes: [],
        applications_used: [],
        hashtags: [],
        activity_by_year: {},
        working_hours_of_week_opening: [],
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCountry],
        rowCount: 1,
      });

      const result = await countryService.getCountryProfile(42);

      expect(result).toEqual(mockCountry);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [42]);
    });

    it('should throw ApiError with 404 when country does not exist', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await expect(countryService.getCountryProfile(99999)).rejects.toThrow(ApiError);
      await expect(countryService.getCountryProfile(99999)).rejects.toThrow('Country not found');

      try {
        await countryService.getCountryProfile(99999);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(404);
        }
      }
    });

    it('should handle database errors and throw 500', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(countryService.getCountryProfile(42)).rejects.toThrow();

      try {
        await countryService.getCountryProfile(42);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(500);
        }
      }
    });

    it('should handle null country name correctly', async () => {
      const mockCountry: CountryProfile = {
        dimension_country_id: 45,
        country_id: 42,
        country_name: null,
        country_name_en: null,
        country_name_es: null,
        iso_alpha2: null,
        history_whole_open: 0,
        history_whole_closed: 0,
        avg_days_to_resolution: null,
        resolution_rate: null,
        notes_health_score: null,
        new_vs_resolved_ratio: null,
        notes_backlog_size: null,
        notes_created_last_30_days: null,
        notes_resolved_last_30_days: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCountry],
        rowCount: 1,
      });

      const result = await countryService.getCountryProfile(42);

      expect(result.country_name).toBeNull();
      expect(result).toEqual(mockCountry);
    });
  });
});
