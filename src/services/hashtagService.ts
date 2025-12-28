/**
 * Hashtag service
 * Handles business logic for hashtag operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  HashtagListResult,
  HashtagListParams,
  HashtagDetailsResult,
  HashtagEntry,
  Pagination,
  HashtagUserSummary,
  HashtagCountrySummary,
} from '../types';

/**
 * Database row type for hashtag aggregation
 */
interface HashtagAggRow {
  hashtag: string;
  count: string | number;
}

/**
 * Database row type for user with hashtag
 */
interface UserHashtagRow {
  user_id: number;
  username: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
}

/**
 * Database row type for country with hashtag
 */
interface CountryHashtagRow {
  country_id: number;
  country_name: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
}

/**
 * Get list of hashtags with usage counts
 * @param params - Query parameters (pagination, ordering)
 * @returns List of hashtags with counts and pagination
 * @throws ApiError with 500 if database error occurs
 */
export async function getHashtags(params: HashtagListParams = {}): Promise<HashtagListResult> {
  const pool = getDatabasePool();

  try {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    const order = params.order || 'desc'; // Default to desc (most common first)

    // Query to extract and aggregate hashtags from both users and countries
    // Using jsonb_array_elements_text to extract hashtags from JSONB arrays
    const query = `
      WITH all_hashtags AS (
        -- Extract hashtags from users
        SELECT jsonb_array_elements_text(hashtags) as hashtag
        FROM dwh.datamartUsers
        WHERE hashtags IS NOT NULL AND jsonb_typeof(hashtags) = 'array'
        
        UNION ALL
        
        -- Extract hashtags from countries
        SELECT jsonb_array_elements_text(hashtags) as hashtag
        FROM dwh.datamartCountries
        WHERE hashtags IS NOT NULL AND jsonb_typeof(hashtags) = 'array'
      ),
      hashtag_counts AS (
        SELECT 
          hashtag,
          COUNT(*) as count
        FROM all_hashtags
        WHERE hashtag IS NOT NULL AND hashtag != ''
        GROUP BY hashtag
      )
      SELECT 
        hashtag,
        count
      FROM hashtag_counts
      ORDER BY count ${order.toUpperCase()}, hashtag ASC
      LIMIT $1 OFFSET $2
    `;

    // Count query for pagination
    const countQuery = `
      WITH all_hashtags AS (
        SELECT jsonb_array_elements_text(hashtags) as hashtag
        FROM dwh.datamartUsers
        WHERE hashtags IS NOT NULL AND jsonb_typeof(hashtags) = 'array'
        
        UNION ALL
        
        SELECT jsonb_array_elements_text(hashtags) as hashtag
        FROM dwh.datamartCountries
        WHERE hashtags IS NOT NULL AND jsonb_typeof(hashtags) = 'array'
      )
      SELECT COUNT(DISTINCT hashtag) as count
      FROM all_hashtags
      WHERE hashtag IS NOT NULL AND hashtag != ''
    `;

    logger.debug('Executing get hashtags query', { page, limit, order });

    const [dataResult, countResult] = await Promise.all([
      pool.query<HashtagAggRow>(query, [limit, offset]),
      pool.query<{ count: string | number }>(countQuery),
    ]);

    const hashtags: HashtagEntry[] = dataResult.rows.map((row) => ({
      hashtag: row.hashtag,
      count: typeof row.count === 'string' ? parseInt(row.count, 10) : row.count,
    }));

    const countRow = countResult.rows[0];
    const total = countRow
      ? typeof countRow.count === 'string'
        ? parseInt(countRow.count, 10)
        : countRow.count
      : 0;
    const totalPages = Math.ceil(total / limit);

    const pagination: Pagination = {
      page,
      limit,
      total,
      total_pages: totalPages,
    };

    logger.debug('Get hashtags completed', { total, page, limit });

    return {
      data: hashtags,
      pagination,
    };
  } catch (error) {
    logger.error('Error getting hashtags', {
      service: 'osm-notes-api',
      params,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}

/**
 * Get details for a specific hashtag
 * @param hashtag - The hashtag to get details for
 * @returns Hashtag details with users and countries using it
 * @throws ApiError with 500 if database error occurs
 */
export async function getHashtagDetails(hashtag: string): Promise<HashtagDetailsResult> {
  const pool = getDatabasePool();

  try {
    // Query users that have this hashtag
    const usersQuery = `
      SELECT 
        user_id,
        username,
        history_whole_open,
        history_whole_closed
      FROM dwh.datamartUsers
      WHERE hashtags IS NOT NULL 
        AND jsonb_typeof(hashtags) = 'array'
        AND $1 = ANY(SELECT jsonb_array_elements_text(hashtags))
      ORDER BY history_whole_open DESC
      LIMIT 50
    `;

    // Query countries that have this hashtag
    const countriesQuery = `
      SELECT 
        country_id,
        country_name,
        history_whole_open,
        history_whole_closed
      FROM dwh.datamartCountries
      WHERE hashtags IS NOT NULL 
        AND jsonb_typeof(hashtags) = 'array'
        AND $1 = ANY(SELECT jsonb_array_elements_text(hashtags))
      ORDER BY history_whole_open DESC
      LIMIT 50
    `;

    // Count queries
    const usersCountQuery = `
      SELECT COUNT(*) as count
      FROM dwh.datamartUsers
      WHERE hashtags IS NOT NULL 
        AND jsonb_typeof(hashtags) = 'array'
        AND $1 = ANY(SELECT jsonb_array_elements_text(hashtags))
    `;

    const countriesCountQuery = `
      SELECT COUNT(*) as count
      FROM dwh.datamartCountries
      WHERE hashtags IS NOT NULL 
        AND jsonb_typeof(hashtags) = 'array'
        AND $1 = ANY(SELECT jsonb_array_elements_text(hashtags))
    `;

    logger.debug('Executing get hashtag details query', { hashtag });

    const [usersResult, countriesResult, usersCountResult, countriesCountResult] =
      await Promise.all([
        pool.query<UserHashtagRow>(usersQuery, [hashtag]),
        pool.query<CountryHashtagRow>(countriesQuery, [hashtag]),
        pool.query<{ count: string | number }>(usersCountQuery, [hashtag]),
        pool.query<{ count: string | number }>(countriesCountQuery, [hashtag]),
      ]);

    const users: HashtagUserSummary[] = usersResult.rows.map((row) => ({
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
    }));

    const countries: HashtagCountrySummary[] = countriesResult.rows.map((row) => ({
      country_id: row.country_id,
      country_name: row.country_name,
      history_whole_open:
        typeof row.history_whole_open === 'string'
          ? parseInt(row.history_whole_open, 10)
          : row.history_whole_open,
      history_whole_closed:
        typeof row.history_whole_closed === 'string'
          ? parseInt(row.history_whole_closed, 10)
          : row.history_whole_closed,
    }));

    const usersCountRow = usersCountResult.rows[0];
    const usersCount = usersCountRow
      ? typeof usersCountRow.count === 'string'
        ? parseInt(usersCountRow.count, 10)
        : usersCountRow.count
      : 0;

    const countriesCountRow = countriesCountResult.rows[0];
    const countriesCount = countriesCountRow
      ? typeof countriesCountRow.count === 'string'
        ? parseInt(countriesCountRow.count, 10)
        : countriesCountRow.count
      : 0;

    logger.debug('Get hashtag details completed', {
      hashtag,
      usersCount,
      countriesCount,
    });

    return {
      hashtag,
      users_count: usersCount,
      countries_count: countriesCount,
      users,
      countries,
    };
  } catch (error) {
    logger.error('Error getting hashtag details', {
      service: 'osm-notes-api',
      hashtag,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
