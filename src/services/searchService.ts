/**
 * Search service
 * Handles business logic for search operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

/**
 * Search result for users
 */
export interface UserSearchResult {
  user_id: number;
  username: string | null;
  history_whole_open: number;
  history_whole_closed: number;
}

/**
 * Search result for countries
 */
export interface CountrySearchResult {
  country_id: number;
  country_name: string | null;
  country_name_en: string | null;
  country_name_es: string | null;
  iso_alpha2: string | null;
  history_whole_open: number;
  history_whole_closed: number;
}

/**
 * Database row type for user search result
 */
interface UserSearchRow {
  user_id: number;
  username: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
}

/**
 * Database row type for country search result
 */
interface CountrySearchRow {
  country_id: number;
  country_name: string | null;
  country_name_en: string | null;
  country_name_es: string | null;
  iso_alpha2: string | null;
  history_whole_open: number | string;
  history_whole_closed: number | string;
}

/**
 * Search users by username or user_id
 * @param query - Search query (username pattern or user_id)
 * @returns Array of matching users (max 50)
 * @throws ApiError with 500 if database error occurs
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const pool = getDatabasePool();

  try {
    // Check if query is numeric (user_id search)
    const isNumeric = /^\d+$/.test(query.trim());

    let sqlQuery: string;
    let params: unknown[];

    if (isNumeric) {
      // Search by user_id (exact match)
      sqlQuery = `
        SELECT 
          user_id,
          username,
          history_whole_open,
          history_whole_closed
        FROM dwh.datamartUsers
        WHERE user_id = $1
        ORDER BY user_id
        LIMIT 50
      `;
      params = [parseInt(query.trim(), 10)];
    } else {
      // Search by username (pattern match)
      const searchPattern = `%${query.trim()}%`;
      sqlQuery = `
        SELECT 
          user_id,
          username,
          history_whole_open,
          history_whole_closed
        FROM dwh.datamartUsers
        WHERE username ILIKE $1
        ORDER BY username
        LIMIT 50
      `;
      params = [searchPattern];
    }

    logger.debug('Executing user search query', { query, isNumeric });

    const result = await pool.query<UserSearchRow>(sqlQuery, params);

    const users: UserSearchResult[] = result.rows.map((row) => ({
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

    logger.debug('User search completed', { query, count: users.length });

    return users;
  } catch (error) {
    logger.error('Error searching users', {
      service: 'osm-notes-api',
      query,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}

/**
 * Search countries by name (any language) or ISO code or country_id
 * @param query - Search query (country name pattern, ISO code, or country_id)
 * @returns Array of matching countries (max 50)
 * @throws ApiError with 500 if database error occurs
 */
export async function searchCountries(query: string): Promise<CountrySearchResult[]> {
  const pool = getDatabasePool();

  try {
    // Check if query is numeric (country_id search)
    const isNumeric = /^\d+$/.test(query.trim());

    let sqlQuery: string;
    let params: unknown[];

    if (isNumeric) {
      // Search by country_id (exact match)
      sqlQuery = `
        SELECT 
          country_id,
          country_name,
          country_name_en,
          country_name_es,
          iso_alpha2,
          history_whole_open,
          history_whole_closed
        FROM dwh.datamartCountries
        WHERE country_id = $1
        ORDER BY country_id
        LIMIT 50
      `;
      params = [parseInt(query.trim(), 10)];
    } else {
      // Search by name (any language) or ISO code (pattern match)
      const searchPattern = `%${query.trim()}%`;
      sqlQuery = `
        SELECT 
          country_id,
          country_name,
          country_name_en,
          country_name_es,
          iso_alpha2,
          history_whole_open,
          history_whole_closed
        FROM dwh.datamartCountries
        WHERE 
          country_name ILIKE $1
          OR country_name_en ILIKE $1
          OR country_name_es ILIKE $1
          OR iso_alpha2 ILIKE $1
        ORDER BY country_name
        LIMIT 50
      `;
      params = [searchPattern];
    }

    logger.debug('Executing country search query', { query, isNumeric });

    const result = await pool.query<CountrySearchRow>(sqlQuery, params);

    const countries: CountrySearchResult[] = result.rows.map((row) => ({
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
    }));

    logger.debug('Country search completed', { query, count: countries.length });

    return countries;
  } catch (error) {
    logger.error('Error searching countries', {
      service: 'osm-notes-api',
      query,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
