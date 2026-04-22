/**
 * Trends service
 * Handles business logic for temporal trend analysis
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { TrendsParams, TrendsResult, TrendEntry } from '../types';
import { buildTrendsFromDatamartRow } from '../utils/activityByYear';

/**
 * Parse working_hours_of_week_opening JSON
 */
function parseWorkingHours(workingHoursJson: string | null): number[] | undefined {
  if (!workingHoursJson) {
    return undefined;
  }

  try {
    const hours: unknown =
      typeof workingHoursJson === 'string' ? JSON.parse(workingHoursJson) : workingHoursJson;

    if (Array.isArray(hours)) {
      return hours.map((h) => (typeof h === 'number' ? h : 0));
    }

    return undefined;
  } catch (error) {
    logger.warn('Failed to parse working_hours_of_week_opening', { error });
    return undefined;
  }
}

/**
 * Get trends for users, countries, or global
 * @param params - Trends query parameters
 * @returns Trends result with temporal data
 * @throws ApiError with 404 if entity not found, 500 if database error
 */
export async function getTrends(params: TrendsParams): Promise<TrendsResult> {
  const pool = getDatabasePool();

  try {
    if (params.type === 'users' && params.user_id) {
      const query = `
        SELECT *
        FROM dwh.datamartUsers
        WHERE user_id = $1
      `;

      logger.debug('Executing get trends for user query', { userId: params.user_id });

      const result = await pool.query(query, [params.user_id]);

      if (result.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const row = result.rows[0] as Record<string, unknown>;
      const trends: TrendEntry[] = buildTrendsFromDatamartRow(row, 'user');
      const woh = row.working_hours_of_week_opening;
      const whStr =
        woh === null || woh === undefined
          ? null
          : typeof woh === 'string'
            ? woh
            : JSON.stringify(woh);
      const workingHours = parseWorkingHours(whStr);

      return {
        type: 'users',
        entity_id: row.user_id as number,
        entity_name: row.username as string | null,
        trends,
        working_hours: workingHours,
      };
    }

    if (params.type === 'countries' && params.country_id) {
      const query = `
        SELECT *
        FROM dwh.datamartCountries
        WHERE country_id = $1
      `;

      logger.debug('Executing get trends for country query', {
        countryId: params.country_id,
      });

      const result = await pool.query(query, [params.country_id]);

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Country not found');
      }

      const row = result.rows[0] as Record<string, unknown>;
      const trends: TrendEntry[] = buildTrendsFromDatamartRow(row, 'country');
      const woh = row.working_hours_of_week_opening;
      const whStr =
        woh === null || woh === undefined
          ? null
          : typeof woh === 'string'
            ? woh
            : JSON.stringify(woh);
      const workingHours = parseWorkingHours(whStr);

      return {
        type: 'countries',
        entity_id: row.country_id as number,
        entity_name: row.country_name as string | null,
        trends,
        working_hours: workingHours,
      };
    }

    if (params.type === 'global') {
      const query = `
        SELECT *
        FROM dwh.datamartGlobal
        LIMIT 1
      `;

      logger.debug('Executing get trends for global query');

      const result = await pool.query(query);

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Global analytics not found');
      }

      const row = result.rows[0] as Record<string, unknown>;
      const trends: TrendEntry[] = buildTrendsFromDatamartRow(row, 'global');

      return {
        type: 'global',
        trends,
      };
    }

    throw new ApiError(400, 'Invalid trends parameters');
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error getting trends', {
      service: 'osm-notes-api',
      params,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
