/**
 * User service
 * Handles business logic for user operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { UserProfile, UserListParams, SearchResult } from '../types';
import { buildActivityByYearFromRow } from '../utils/activityByYear';

/** Row from `SELECT *` on dwh.datamartUsers; extra `history_YYYY_*` keys come from OSM-Notes-Analytics. */
interface DatamartUserProfileDbRow {
  dimension_user_id: number | string;
  user_id: number | string;
  username: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
  history_whole_commented: number | string;
  avg_days_to_resolution: number | string | null;
  resolution_rate: number | string | null;
  user_response_time: number | string | null;
  days_since_last_action: number | string | null;
  applications_used: unknown;
  collaboration_patterns: unknown;
  countries_open_notes: unknown;
  hashtags: unknown;
  date_starting_creating_notes: unknown;
  date_starting_solving_notes: unknown;
  last_year_activity: string | null;
  working_hours_of_week_opening: unknown;
  activity_by_year?: unknown;
  [key: string]: unknown;
}

interface UserListDbRow {
  dimension_user_id: number | string;
  user_id: number | string;
  username: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
  history_whole_commented: number | string;
  avg_days_to_resolution: number | string | null;
  resolution_rate: number | string | null;
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
      SELECT *
      FROM dwh.datamartUsers
      WHERE user_id = $1
    `;

    logger.debug('Executing query to get user profile', { userId });

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      logger.warn('User not found', { userId });
      throw new ApiError(404, 'User not found');
    }

    const row = result.rows[0] as unknown as DatamartUserProfileDbRow;
    const activityByYear = buildActivityByYearFromRow(row as Record<string, unknown>);

    // Convert numeric fields from string to number if needed
    const userProfile: UserProfile = {
      dimension_user_id: Number(row.dimension_user_id),
      user_id: Number(row.user_id),
      username: row.username,
      history_whole_open:
        typeof row.history_whole_open === 'string'
          ? parseInt(row.history_whole_open, 10)
          : Number(row.history_whole_open),
      history_whole_closed:
        typeof row.history_whole_closed === 'string'
          ? parseInt(row.history_whole_closed, 10)
          : Number(row.history_whole_closed),
      history_whole_commented:
        typeof row.history_whole_commented === 'string'
          ? parseInt(row.history_whole_commented, 10)
          : Number(row.history_whole_commented),
      avg_days_to_resolution:
        row.avg_days_to_resolution === null || row.avg_days_to_resolution === undefined
          ? null
          : typeof row.avg_days_to_resolution === 'string'
            ? parseFloat(row.avg_days_to_resolution)
            : Number(row.avg_days_to_resolution),
      resolution_rate:
        row.resolution_rate === null || row.resolution_rate === undefined
          ? null
          : typeof row.resolution_rate === 'string'
            ? parseFloat(row.resolution_rate)
            : Number(row.resolution_rate),
      user_response_time:
        row.user_response_time === null || row.user_response_time === undefined
          ? null
          : typeof row.user_response_time === 'string'
            ? parseFloat(row.user_response_time)
            : Number(row.user_response_time),
      days_since_last_action:
        row.days_since_last_action === null || row.days_since_last_action === undefined
          ? null
          : typeof row.days_since_last_action === 'string'
            ? parseInt(row.days_since_last_action, 10)
            : Number(row.days_since_last_action),
      applications_used: row.applications_used,
      collaboration_patterns: row.collaboration_patterns,
      countries_open_notes: row.countries_open_notes,
      hashtags: row.hashtags,
      date_starting_creating_notes:
        row.date_starting_creating_notes as UserProfile['date_starting_creating_notes'],
      date_starting_solving_notes:
        row.date_starting_solving_notes as UserProfile['date_starting_solving_notes'],
      last_year_activity: row.last_year_activity,
      working_hours_of_week_opening: row.working_hours_of_week_opening,
      activity_by_year: Object.keys(activityByYear).length > 0 ? activityByYear : {},
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

/**
 * List users with pagination
 * @param params - List parameters (page, limit, sort, order)
 * @returns Paginated list of users
 */
export async function listUsers(params: UserListParams): Promise<SearchResult<UserProfile>> {
  const pool = getDatabasePool();
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const offset = (page - 1) * limit;
  const sortField = params.sort || 'user_id';
  const sortOrder = params.order === 'asc' ? 'ASC' : 'DESC';

  const allowedSortFields = [
    'user_id',
    'username',
    'history_whole_open',
    'history_whole_closed',
    'resolution_rate',
  ];
  const safeSort = allowedSortFields.includes(sortField) ? sortField : 'user_id';

  try {
    const countQuery = 'SELECT COUNT(*) as total FROM dwh.datamartUsers';
    const countResult = await pool.query<{ total: string }>(countQuery);
    const total = parseInt(countResult.rows[0].total, 10);

    const query = `
      SELECT
        dimension_user_id,
        user_id,
        username,
        history_whole_open,
        history_whole_closed,
        history_whole_commented,
        avg_days_to_resolution,
        resolution_rate
      FROM dwh.datamartUsers
      ORDER BY ${safeSort} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    logger.debug('Listing users', { page, limit, sort: safeSort, order: sortOrder });

    const result = await pool.query(query, [limit, offset]);

    const users: UserProfile[] = (result.rows as UserListDbRow[]).map((row) => ({
      dimension_user_id: Number(row.dimension_user_id),
      user_id: Number(row.user_id),
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
      user_response_time: null,
      days_since_last_action: null,
    }));

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error listing users', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError(500, 'Internal server error');
  }
}
