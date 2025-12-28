/**
 * Trends service
 * Handles business logic for temporal trend analysis
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { TrendsParams, TrendsResult, TrendEntry } from '../types';

/**
 * Database row type for user trends
 */
interface UserTrendRow {
  user_id: number;
  username: string | null;
  activity_by_year: string | null;
  working_hours_of_week_opening: string | null;
}

/**
 * Database row type for country trends
 */
interface CountryTrendRow {
  country_id: number;
  country_name: string | null;
  activity_by_year: string | null;
  working_hours_of_week_opening: string | null;
}

/**
 * Database row type for global trends
 */
interface GlobalTrendRow {
  activity_by_year: string | null;
}

/**
 * Parse activity_by_year JSON and convert to TrendEntry array
 */
function parseActivityByYear(activityJson: string | null): TrendEntry[] {
  if (!activityJson) {
    return [];
  }

  try {
    const activity: unknown =
      typeof activityJson === 'string' ? JSON.parse(activityJson) : activityJson;

    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
      return [];
    }

    const trends: TrendEntry[] = [];
    const activityObj = activity as Record<string, unknown>;

    for (const [year, data] of Object.entries(activityObj)) {
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        'open' in data &&
        'closed' in data
      ) {
        const typedData = data as { open: unknown; closed: unknown };
        trends.push({
          year: String(year),
          open: typeof typedData.open === 'number' ? typedData.open : 0,
          closed: typeof typedData.closed === 'number' ? typedData.closed : 0,
        });
      }
    }

    // Sort by year ascending
    return trends.sort((a, b) => a.year.localeCompare(b.year));
  } catch (error) {
    logger.warn('Failed to parse activity_by_year', { error });
    return [];
  }
}

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
        SELECT 
          user_id,
          username,
          activity_by_year,
          working_hours_of_week_opening
        FROM dwh.datamartUsers
        WHERE user_id = $1
      `;

      logger.debug('Executing get trends for user query', { userId: params.user_id });

      const result = await pool.query<UserTrendRow>(query, [params.user_id]);

      if (result.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const row = result.rows[0];
      const trends = parseActivityByYear(row.activity_by_year);
      const workingHours = parseWorkingHours(row.working_hours_of_week_opening);

      return {
        type: 'users',
        entity_id: row.user_id,
        entity_name: row.username,
        trends,
        working_hours: workingHours,
      };
    }

    if (params.type === 'countries' && params.country_id) {
      const query = `
        SELECT 
          country_id,
          country_name,
          activity_by_year,
          working_hours_of_week_opening
        FROM dwh.datamartCountries
        WHERE country_id = $1
      `;

      logger.debug('Executing get trends for country query', {
        countryId: params.country_id,
      });

      const result = await pool.query<CountryTrendRow>(query, [params.country_id]);

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Country not found');
      }

      const row = result.rows[0];
      const trends = parseActivityByYear(row.activity_by_year);
      const workingHours = parseWorkingHours(row.working_hours_of_week_opening);

      return {
        type: 'countries',
        entity_id: row.country_id,
        entity_name: row.country_name,
        trends,
        working_hours: workingHours,
      };
    }

    if (params.type === 'global') {
      const query = `
        SELECT 
          activity_by_year
        FROM dwh.datamartGlobal
        LIMIT 1
      `;

      logger.debug('Executing get trends for global query');

      const result = await pool.query<GlobalTrendRow>(query);

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Global analytics not found');
      }

      const row = result.rows[0];
      const trends = parseActivityByYear(row.activity_by_year);

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
