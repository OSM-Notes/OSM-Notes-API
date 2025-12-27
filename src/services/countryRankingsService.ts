/**
 * Country rankings service
 * Handles business logic for country rankings operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  CountryRankingsParams,
  CountryRankingsResult,
  CountryRankingEntry,
  CountryRankingMetric,
} from '../types';

/**
 * Valid metrics for country rankings
 */
const VALID_METRICS: CountryRankingMetric[] = [
  'history_whole_open',
  'history_whole_closed',
  'resolution_rate',
  'avg_days_to_resolution',
  'notes_health_score',
];

/**
 * Get country rankings by metric
 * @param params - Ranking parameters (metric, limit, order)
 * @returns Country rankings result
 * @throws ApiError with 400 if invalid parameters
 * @throws ApiError with 500 if database error occurs
 */
export async function getCountryRankings(
  params: CountryRankingsParams
): Promise<CountryRankingsResult> {
  const { metric, limit, order = 'desc' } = params;

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
    // Build ORDER BY clause
    const orderClause = order === 'asc' ? 'ASC' : 'DESC';

    // Build query
    const query = `
      SELECT 
        country_id,
        country_name,
        ${metric}
      FROM dwh.datamartCountries
      ORDER BY ${metric} ${orderClause} NULLS LAST
      LIMIT $1
    `;

    logger.debug('Executing country rankings query', { metric, limit, order });

    const result = await pool.query(query, [limit]);

    // Build rankings array with rank numbers
    const rankings: CountryRankingEntry[] = result.rows.map(
      (row: Record<string, unknown>, index) => {
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
          country_id: row.country_id as number,
          country_name: (row.country_name as string) || null,
          value,
        };
      }
    );

    const rankingsResult: CountryRankingsResult = {
      metric,
      order,
      rankings,
    };

    logger.debug('Country rankings query completed', {
      metric,
      resultsCount: rankings.length,
    });

    return rankingsResult;
  } catch (error) {
    logger.error('Error getting country rankings', {
      metric,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
