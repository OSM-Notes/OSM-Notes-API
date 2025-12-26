/**
 * Country service
 * Handles business logic for country operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { CountryProfile } from '../types';

/**
 * Database row type for country query result
 */
interface CountryRow {
  dimension_country_id: number;
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
  users_open_notes?: unknown;
  applications_used?: unknown;
  hashtags?: unknown;
  activity_by_year?: unknown;
  working_hours_of_week_opening?: unknown;
}

/**
 * Get country profile by country ID
 * @param countryId - The country ID
 * @returns The country profile object
 * @throws ApiError with 404 if country not found
 * @throws ApiError with 500 if database error occurs
 */
export async function getCountryProfile(countryId: number): Promise<CountryProfile> {
  const pool = getDatabasePool();

  try {
    const query = `
      SELECT 
        dimension_country_id,
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
        notes_resolved_last_30_days,
        users_open_notes,
        applications_used,
        hashtags,
        activity_by_year,
        working_hours_of_week_opening
      FROM dwh.datamartCountries
      WHERE country_id = $1
    `;

    logger.debug('Executing query to get country profile', { countryId });

    const result = await pool.query<CountryRow>(query, [countryId]);

    if (result.rows.length === 0) {
      logger.warn('Country not found', { countryId });
      throw new ApiError(404, 'Country not found');
    }

    const row = result.rows[0];

    // Convert numeric fields from string to number if needed
    const countryProfile: CountryProfile = {
      dimension_country_id: row.dimension_country_id,
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
      users_open_notes: row.users_open_notes,
      applications_used: row.applications_used,
      hashtags: row.hashtags,
      activity_by_year: row.activity_by_year,
      working_hours_of_week_opening: row.working_hours_of_week_opening,
    };

    logger.debug('Country profile retrieved successfully', {
      countryId,
      countryName: countryProfile.country_name,
    });

    return countryProfile;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error getting country profile', {
      countryId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
