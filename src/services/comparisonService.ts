/**
 * Comparison service
 * Handles business logic for comparing users and countries
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  UserComparisonResult,
  CountryComparisonResult,
  UserComparisonEntry,
  CountryComparisonEntry,
} from '../types';

/**
 * Database row type for user comparison
 */
interface UserRow {
  user_id: number;
  username: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
  history_whole_commented: number | string;
  avg_days_to_resolution: number | string | null;
  resolution_rate: number | string | null;
  user_response_time: number | string | null;
}

/**
 * Database row type for country comparison
 */
interface CountryRow {
  country_id: number;
  country_name: string | null;
  country_name_en: string | null;
  country_name_es: string | null;
  iso_alpha2: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
  avg_days_to_resolution: number | string | null;
  resolution_rate: number | string | null;
  notes_health_score: number | string | null;
  new_vs_resolved_ratio: number | string | null;
  notes_backlog_size: number | string | null;
  notes_created_last_30_days: number | string | null;
  notes_resolved_last_30_days: number | string | null;
}

/**
 * Compare multiple users by their metrics
 * @param userIds - Array of user IDs to compare (max 10)
 * @returns Comparison result with user metrics
 * @throws ApiError with 500 if database error occurs
 */
export async function compareUsers(userIds: number[]): Promise<UserComparisonResult> {
  const pool = getDatabasePool();

  try {
    // Limit to maximum 10 users
    const limitedIds = userIds.slice(0, 10);

    if (limitedIds.length === 0) {
      return {
        type: 'users',
        entities: [],
      };
    }

    const query = `
      SELECT 
        user_id,
        username,
        history_whole_open,
        history_whole_closed,
        history_whole_commented,
        avg_days_to_resolution,
        resolution_rate,
        user_response_time
      FROM dwh.datamartUsers
      WHERE user_id = ANY($1::int[])
      ORDER BY user_id
    `;

    logger.debug('Executing compare users query', { userIds: limitedIds });

    const result = await pool.query<UserRow>(query, [limitedIds]);

    const entities: UserComparisonEntry[] = result.rows.map((row) => ({
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
    }));

    logger.debug('Compare users completed', { count: entities.length });

    return {
      type: 'users',
      entities,
    };
  } catch (error) {
    logger.error('Error comparing users', {
      service: 'osm-notes-api',
      userIds,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}

/**
 * Compare multiple countries by their metrics
 * @param countryIds - Array of country IDs to compare (max 10)
 * @returns Comparison result with country metrics
 * @throws ApiError with 500 if database error occurs
 */
export async function compareCountries(countryIds: number[]): Promise<CountryComparisonResult> {
  const pool = getDatabasePool();

  try {
    // Limit to maximum 10 countries
    const limitedIds = countryIds.slice(0, 10);

    if (limitedIds.length === 0) {
      return {
        type: 'countries',
        entities: [],
      };
    }

    const query = `
      SELECT 
        country_id,
        country_name,
        country_name_en,
        country_name_es,
        iso_alpha2,
        history_whole_open,
        history_whole_closed,
        avg_days_to_resolution,
        resolution_rate,
        notes_health_score,
        new_vs_resolved_ratio,
        notes_backlog_size,
        notes_created_last_30_days,
        notes_resolved_last_30_days
      FROM dwh.datamartCountries
      WHERE country_id = ANY($1::int[])
      ORDER BY country_id
    `;

    logger.debug('Executing compare countries query', { countryIds: limitedIds });

    const result = await pool.query<CountryRow>(query, [limitedIds]);

    const entities: CountryComparisonEntry[] = result.rows.map((row) => ({
      country_id: row.country_id,
      country_name: row.country_name,
      country_name_en: row.country_name_en,
      country_name_es: row.country_name_es,
      iso_alpha2: row.iso_alpha2,
      history_whole_open:
        typeof row.history_whole_open === 'string'
          ? parseInt(row.history_whole_open, 10)
          : row.history_whole_open,
      history_whole_closed:
        typeof row.history_whole_closed === 'string'
          ? parseInt(row.history_whole_closed, 10)
          : row.history_whole_closed,
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
      notes_health_score:
        row.notes_health_score === null
          ? null
          : typeof row.notes_health_score === 'string'
            ? parseFloat(row.notes_health_score)
            : row.notes_health_score,
      new_vs_resolved_ratio:
        row.new_vs_resolved_ratio === null
          ? null
          : typeof row.new_vs_resolved_ratio === 'string'
            ? parseFloat(row.new_vs_resolved_ratio)
            : row.new_vs_resolved_ratio,
      notes_backlog_size:
        row.notes_backlog_size === null
          ? null
          : typeof row.notes_backlog_size === 'string'
            ? parseInt(row.notes_backlog_size, 10)
            : row.notes_backlog_size,
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
    }));

    logger.debug('Compare countries completed', { count: entities.length });

    return {
      type: 'countries',
      entities,
    };
  } catch (error) {
    logger.error('Error comparing countries', {
      service: 'osm-notes-api',
      countryIds,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
