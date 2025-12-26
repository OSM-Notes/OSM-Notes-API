/**
 * User service
 * Handles business logic for user operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { UserProfile } from '../types';

/**
 * Database row type for user query result
 */
interface UserRow {
  dimension_user_id: number;
  user_id: number;
  username: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
  history_whole_commented: number | string;
  avg_days_to_resolution: number | string | null;
  resolution_rate: number | string | null;
  user_response_time: number | string | null;
  days_since_last_action: number | string | null;
  applications_used?: unknown;
  collaboration_patterns?: unknown;
  countries_open_notes?: unknown;
  hashtags?: unknown;
  date_starting_creating_notes?: Date | string | null;
  date_starting_solving_notes?: Date | string | null;
  last_year_activity?: string | null;
  working_hours_of_week_opening?: unknown;
  activity_by_year?: unknown;
}

/**
 * Get user profile by user ID
 * @param userId - The user ID
 * @returns The user profile object
 * @throws ApiError with 404 if user not found
 * @throws ApiError with 500 if database error occurs
 */
export async function getUserProfile(userId: number): Promise<UserProfile> {
  const pool = getDatabasePool();

  try {
    const query = `
      SELECT 
        dimension_user_id,
        user_id,
        username,
        history_whole_open,
        history_whole_closed,
        history_whole_commented,
        avg_days_to_resolution,
        resolution_rate,
        user_response_time,
        days_since_last_action,
        applications_used,
        collaboration_patterns,
        countries_open_notes,
        hashtags,
        date_starting_creating_notes,
        date_starting_solving_notes,
        last_year_activity,
        working_hours_of_week_opening,
        activity_by_year
      FROM dwh.datamartUsers
      WHERE user_id = $1
    `;

    logger.debug('Executing query to get user profile', { userId });

    const result = await pool.query<UserRow>(query, [userId]);

    if (result.rows.length === 0) {
      logger.warn('User not found', { userId });
      throw new ApiError(404, 'User not found');
    }

    const row = result.rows[0];

    // Convert numeric fields from string to number if needed
    const userProfile: UserProfile = {
      dimension_user_id: row.dimension_user_id,
      user_id: row.user_id,
      username: row.username,
      history_whole_open:
        typeof row.history_whole_open === 'string'
          ? parseInt(row.history_whole_open, 10)
          : row.history_whole_open,
      history_whole_closed:
        typeof row.history_whole_closed === 'string'
          ? parseInt(row.history_whole_closed, 10)
          : row.history_whole_closed,
      history_whole_commented:
        typeof row.history_whole_commented === 'string'
          ? parseInt(row.history_whole_commented, 10)
          : row.history_whole_commented,
      avg_days_to_resolution:
        row.avg_days_to_resolution === null
          ? null
          : typeof row.avg_days_to_resolution === 'string'
            ? parseFloat(row.avg_days_to_resolution)
            : row.avg_days_to_resolution,
      resolution_rate:
        row.resolution_rate === null
          ? null
          : typeof row.resolution_rate === 'string'
            ? parseFloat(row.resolution_rate)
            : row.resolution_rate,
      user_response_time:
        row.user_response_time === null
          ? null
          : typeof row.user_response_time === 'string'
            ? parseFloat(row.user_response_time)
            : row.user_response_time,
      days_since_last_action:
        row.days_since_last_action === null
          ? null
          : typeof row.days_since_last_action === 'string'
            ? parseInt(row.days_since_last_action, 10)
            : row.days_since_last_action,
      applications_used: row.applications_used,
      collaboration_patterns: row.collaboration_patterns,
      countries_open_notes: row.countries_open_notes,
      hashtags: row.hashtags,
      date_starting_creating_notes: row.date_starting_creating_notes,
      date_starting_solving_notes: row.date_starting_solving_notes,
      last_year_activity: row.last_year_activity,
      working_hours_of_week_opening: row.working_hours_of_week_opening,
      activity_by_year: row.activity_by_year,
    };

    logger.debug('User profile retrieved successfully', {
      userId,
      username: userProfile.username,
    });

    return userProfile;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error getting user profile', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
