/**
 * Analytics service
 * Handles business logic for analytics operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { GlobalAnalytics } from '../types';

/**
 * Database row type for global analytics query result
 */
interface GlobalAnalyticsRow {
  dimension_global_id: number;
  history_whole_open: number | string;
  history_whole_closed: number | string;
  currently_open_count: number | string | null;
  avg_days_to_resolution: number | string | null;
  resolution_rate: number | string | null;
  notes_created_last_30_days: number | string | null;
  notes_resolved_last_30_days: number | string | null;
  active_users_count: number | string | null;
  notes_backlog_size: number | string | null;
  applications_used?: unknown;
  top_countries?: unknown;
}

/**
 * Get global analytics
 * @returns The global analytics object
 * @throws ApiError with 500 if database error occurs
 */
export async function getGlobalAnalytics(): Promise<GlobalAnalytics> {
  const pool = getDatabasePool();

  try {
    const query = `
      SELECT 
        dimension_global_id,
        history_whole_open,
        history_whole_closed,
        currently_open_count,
        avg_days_to_resolution,
        resolution_rate,
        notes_created_last_30_days,
        notes_resolved_last_30_days,
        active_users_count,
        notes_backlog_size,
        applications_used,
        top_countries
      FROM dwh.datamartGlobal
      LIMIT 1
    `;

    logger.debug('Executing query to get global analytics');

    const result = await pool.query<GlobalAnalyticsRow>(query);

    if (result.rows.length === 0) {
      logger.warn('Global analytics not found');
      throw new ApiError(404, 'Global analytics not found');
    }

    const row = result.rows[0];

    // Convert numeric fields from string to number if needed
    const globalAnalytics: GlobalAnalytics = {
      dimension_global_id: row.dimension_global_id,
      history_whole_open:
        typeof row.history_whole_open === 'string'
          ? parseInt(row.history_whole_open, 10)
          : row.history_whole_open,
      history_whole_closed:
        typeof row.history_whole_closed === 'string'
          ? parseInt(row.history_whole_closed, 10)
          : row.history_whole_closed,
      currently_open_count:
        row.currently_open_count === null
          ? null
          : typeof row.currently_open_count === 'string'
            ? parseInt(row.currently_open_count, 10)
            : row.currently_open_count,
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
      notes_created_last_30_days:
        row.notes_created_last_30_days === null
          ? null
          : typeof row.notes_created_last_30_days === 'string'
            ? parseInt(row.notes_created_last_30_days, 10)
            : row.notes_created_last_30_days,
      notes_resolved_last_30_days:
        row.notes_resolved_last_30_days === null
          ? null
          : typeof row.notes_resolved_last_30_days === 'string'
            ? parseInt(row.notes_resolved_last_30_days, 10)
            : row.notes_resolved_last_30_days,
      active_users_count:
        row.active_users_count === null
          ? null
          : typeof row.active_users_count === 'string'
            ? parseInt(row.active_users_count, 10)
            : row.active_users_count,
      notes_backlog_size:
        row.notes_backlog_size === null
          ? null
          : typeof row.notes_backlog_size === 'string'
            ? parseInt(row.notes_backlog_size, 10)
            : row.notes_backlog_size,
      applications_used: row.applications_used,
      top_countries: row.top_countries,
    };

    logger.debug('Global analytics retrieved successfully');

    return globalAnalytics;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error getting global analytics', {
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
