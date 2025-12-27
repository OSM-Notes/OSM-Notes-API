/**
 * User rankings service
 * Handles business logic for user rankings operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  UserRankingsParams,
  UserRankingsResult,
  UserRankingEntry,
  UserRankingMetric,
} from '../types';

/**
 * Valid metrics for user rankings
 */
const VALID_METRICS: UserRankingMetric[] = [
  'history_whole_open',
  'history_whole_closed',
  'history_whole_commented',
  'resolution_rate',
  'avg_days_to_resolution',
];

/**
 * Get user rankings by metric
 * @param params - Ranking parameters (metric, country filter, limit, order)
 * @returns User rankings result
 * @throws ApiError with 400 if invalid parameters
 * @throws ApiError with 500 if database error occurs
 */
export async function getUserRankings(params: UserRankingsParams): Promise<UserRankingsResult> {
  const { metric, country, limit, order = 'desc' } = params;

  // Validate metric
  if (!VALID_METRICS.includes(metric)) {
    throw new ApiError(400, `Invalid metric. Valid metrics are: ${VALID_METRICS.join(', ')}`);
  }

  // Validate limit
  if (limit < 1 || limit > 100) {
    throw new ApiError(400, 'Limit must be between 1 and 100');
  }

  const pool = getDatabasePool();

  try {
    // Build WHERE clause
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    // Filter by country if provided
    if (country !== undefined) {
      conditions.push(`dimension_country_id = $${paramIndex}`);
      queryParams.push(country);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderClause = order === 'asc' ? 'ASC' : 'DESC';

    // Build query
    const query = `
      SELECT 
        user_id,
        username,
        ${metric}
      FROM dwh.datamartUsers
      ${whereClause}
      ORDER BY ${metric} ${orderClause} NULLS LAST
      LIMIT $${paramIndex}
    `;

    queryParams.push(limit);

    logger.debug('Executing user rankings query', { metric, country, limit, order });

    const result = await pool.query(query, queryParams);

    // Build rankings array with rank numbers
    const rankings: UserRankingEntry[] = result.rows.map((row: Record<string, unknown>, index) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const metricValue = row[metric];
      const value =
        typeof metricValue === 'string'
          ? parseFloat(metricValue)
          : typeof metricValue === 'number'
            ? metricValue
            : null;

      return {
        rank: index + 1,
        user_id: row.user_id as number,
        username: (row.username as string) || null,
        value,
      };
    });

    const rankingsResult: UserRankingsResult = {
      metric,
      order,
      rankings,
    };

    if (country !== undefined) {
      rankingsResult.country = country;
    }

    logger.debug('User rankings query completed', {
      metric,
      country,
      resultsCount: rankings.length,
    });

    return rankingsResult;
  } catch (error) {
    logger.error('Error getting user rankings', {
      metric,
      country,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
