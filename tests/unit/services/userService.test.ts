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
      mockQuery.mockResolvedValue({
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
      expect(result).toMatchObject(mockUser);
    });

    it('should handle string values from database (history fields)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            dimension_user_id: 123,
            user_id: 12345,
            username: 'test_user',
            history_whole_open: '100', // String instead of number
            history_whole_closed: '50', // String instead of number
            history_whole_commented: '75', // String instead of number
            avg_days_to_resolution: null,
            resolution_rate: null,
            user_response_time: null,
            days_since_last_action: null,
            applications_used: [],
            collaboration_patterns: {},
            countries_open_notes: [],
            hashtags: [],
            date_starting_creating_notes: null,
            date_starting_solving_notes: null,
            last_year_activity: null,
            working_hours_of_week_opening: [],
            activity_by_year: {},
          },
        ],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result.history_whole_open).toBe(100);
      expect(result.history_whole_closed).toBe(50);
      expect(result.history_whole_commented).toBe(75);
    });

    it('should handle string values from database (avg_days_to_resolution)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            dimension_user_id: 123,
            user_id: 12345,
            username: 'test_user',
            history_whole_open: 0,
            history_whole_closed: 0,
            history_whole_commented: 0,
            avg_days_to_resolution: '5.5', // String instead of number
            resolution_rate: null,
            user_response_time: null,
            days_since_last_action: null,
            applications_used: [],
            collaboration_patterns: {},
            countries_open_notes: [],
            hashtags: [],
            date_starting_creating_notes: null,
            date_starting_solving_notes: null,
            last_year_activity: null,
            working_hours_of_week_opening: [],
            activity_by_year: {},
          },
        ],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result.avg_days_to_resolution).toBe(5.5);
    });

    it('should handle null avg_days_to_resolution', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            dimension_user_id: 123,
            user_id: 12345,
            username: 'test_user',
            history_whole_open: 0,
            history_whole_closed: 0,
            history_whole_commented: 0,
            avg_days_to_resolution: null,
            resolution_rate: null,
            user_response_time: null,
            days_since_last_action: null,
            applications_used: [],
            collaboration_patterns: {},
            countries_open_notes: [],
            hashtags: [],
            date_starting_creating_notes: null,
            date_starting_solving_notes: null,
            last_year_activity: null,
            working_hours_of_week_opening: [],
            activity_by_year: {},
          },
        ],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result.avg_days_to_resolution).toBeNull();
    });

    it('should handle string values from database (resolution_rate)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            dimension_user_id: 123,
            user_id: 12345,
            username: 'test_user',
            history_whole_open: 0,
            history_whole_closed: 0,
            history_whole_commented: 0,
            avg_days_to_resolution: null,
            resolution_rate: '50.0', // String instead of number
            user_response_time: null,
            days_since_last_action: null,
            applications_used: [],
            collaboration_patterns: {},
            countries_open_notes: [],
            hashtags: [],
            date_starting_creating_notes: null,
            date_starting_solving_notes: null,
            last_year_activity: null,
            working_hours_of_week_opening: [],
            activity_by_year: {},
          },
        ],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result.resolution_rate).toBe(50.0);
    });

    it('should handle string values from database (user_response_time)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            dimension_user_id: 123,
            user_id: 12345,
            username: 'test_user',
            history_whole_open: 0,
            history_whole_closed: 0,
            history_whole_commented: 0,
            avg_days_to_resolution: null,
            resolution_rate: null,
            user_response_time: '2.3', // String instead of number
            days_since_last_action: null,
            applications_used: [],
            collaboration_patterns: {},
            countries_open_notes: [],
            hashtags: [],
            date_starting_creating_notes: null,
            date_starting_solving_notes: null,
            last_year_activity: null,
            working_hours_of_week_opening: [],
            activity_by_year: {},
          },
        ],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result.user_response_time).toBe(2.3);
    });

    it('should handle string values from database (days_since_last_action)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            dimension_user_id: 123,
            user_id: 12345,
            username: 'test_user',
            history_whole_open: 0,
            history_whole_closed: 0,
            history_whole_commented: 0,
            avg_days_to_resolution: null,
            resolution_rate: null,
            user_response_time: null,
            days_since_last_action: '5', // String instead of number
            applications_used: [],
            collaboration_patterns: {},
            countries_open_notes: [],
            hashtags: [],
            date_starting_creating_notes: null,
            date_starting_solving_notes: null,
            last_year_activity: null,
            working_hours_of_week_opening: [],
            activity_by_year: {},
          },
        ],
        rowCount: 1,
      });

      const result = await userService.getUserProfile(12345);

      expect(result.days_since_last_action).toBe(5);
    });
  });

  describe('getUserIdsByUsername', () => {
    it('should return inferred user ID links for a username', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 12345,
            username: 'test_user',
            first_seen_at: '2024-01-01T00:00:00Z',
            last_seen_at: new Date().toISOString(),
            comments_count: '10',
            notes_count: '8',
          },
        ],
        rowCount: 1,
      });

      const result = await userService.getUserIdsByUsername('test_user');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        user_id: 12345,
        username: 'test_user',
        comments_count: 10,
        notes_count: 8,
      });
      expect(['active', 'inactive']).toContain(result[0].status);
    });
  });

  describe('getInferredHistoryByUserId', () => {
    it('should return inferred history for a user ID', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ username: 'test_user' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 12345,
              username: 'test_user',
              first_seen_at: '2024-01-01T00:00:00Z',
              last_seen_at: '2024-02-01T00:00:00Z',
              comments_count: '10',
              notes_count: '8',
            },
            {
              user_id: 99999,
              username: 'test_user',
              first_seen_at: '2024-03-01T00:00:00Z',
              last_seen_at: '2024-03-10T00:00:00Z',
              comments_count: '4',
              notes_count: '3',
            },
          ],
          rowCount: 2,
        });

      const result = await userService.getInferredHistoryByUserId(12345);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((event) => event.event_type === 'first_seen')).toBe(true);
      expect(result.some((event) => event.event_type === 'last_seen')).toBe(true);
      expect(result.some((event) => event.event_type === 'possible_user_id_change')).toBe(true);
    });

    it('should throw 404 when user ID has no username history', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      try {
        await userService.getInferredHistoryByUserId(12345);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.message).toBe('User not found');
        }
      }
    });
  });
});
