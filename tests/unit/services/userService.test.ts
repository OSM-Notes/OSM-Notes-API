/**
 * Unit tests for userService
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as userService from '../../../src/services/userService';
import { UserProfile } from '../../../src/types';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('userService', () => {
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

  describe('getUserProfile', () => {
    it('should return a valid user profile when user exists', async () => {
      const mockUser: UserProfile = {
        dimension_user_id: 123,
        user_id: 12345,
        username: 'test_user',
        history_whole_open: 100,
        history_whole_closed: 50,
        history_whole_commented: 75,
        avg_days_to_resolution: 5.5,
        resolution_rate: 50.0,
        user_response_time: 2.3,
        days_since_last_action: 5,
        applications_used: [],
        collaboration_patterns: {},
        countries_open_notes: [],
        hashtags: [],
        date_starting_creating_notes: new Date('2020-01-15'),
        date_starting_solving_notes: new Date('2020-02-01'),
        last_year_activity: null,
        working_hours_of_week_opening: [],
        activity_by_year: {},
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [12345]);
    });

    it('should throw ApiError with 404 when user does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(userService.getUserProfile(99999)).rejects.toThrow(ApiError);
      await expect(userService.getUserProfile(99999)).rejects.toThrow('User not found');

      try {
        await userService.getUserProfile(99999);
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

      await expect(userService.getUserProfile(12345)).rejects.toThrow();

      try {
        await userService.getUserProfile(12345);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(500);
        }
      }
    });

    it('should handle null username correctly', async () => {
      const mockUser: UserProfile = {
        dimension_user_id: 123,
        user_id: 12345,
        username: null,
        history_whole_open: 0,
        history_whole_closed: 0,
        history_whole_commented: 0,
        avg_days_to_resolution: null,
        resolution_rate: null,
        user_response_time: null,
        days_since_last_action: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result.username).toBeNull();
      expect(result).toEqual(mockUser);
    });
  });
});
