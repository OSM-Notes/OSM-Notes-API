/**
 * Advanced search service
 * Handles advanced search operations with logical operators and text search
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { Note, AdvancedSearchFilters, SearchResult, Pagination } from '../types';

/**
 * Database row type for note query result
 */
interface NoteRow {
  note_id: number;
  latitude: number | string;
  longitude: number | string;
  status: string;
  created_at: Date;
  closed_at: Date | null;
  id_user: number | null;
  id_country: number | null;
  comments_count: number | string;
}

/**
 * Database row type for count query result
 */
interface CountRow {
  count: string | number;
}

/**
 * Advanced search notes with logical operators and text search
 * @param filters - Advanced search filters
 * @returns Search result with notes and pagination
 * @throws ApiError with 500 if database error occurs
 */
export async function advancedSearchNotes(
  filters: AdvancedSearchFilters
): Promise<SearchResult<Note>> {
  const pool = getDatabasePool();

  try {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    const operator = filters.operator || 'AND'; // Default to AND

    // Build WHERE clause conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Country filter
    if (filters.country !== undefined) {
      conditions.push(`n.id_country = $${paramIndex}`);
      params.push(filters.country);
      paramIndex++;
    }

    // Status filter
    if (filters.status) {
      conditions.push(`n.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    // User ID filter
    if (filters.user_id !== undefined) {
      conditions.push(`n.id_user = $${paramIndex}`);
      params.push(filters.user_id);
      paramIndex++;
    }

    // Date range filters
    if (filters.date_from) {
      conditions.push(`n.created_at >= $${paramIndex}`);
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      conditions.push(`n.created_at <= $${paramIndex}`);
      params.push(filters.date_to);
      paramIndex++;
    }

    // Bounding box filter
    if (filters.bbox) {
      const bboxParts = filters.bbox.split(',');
      if (bboxParts.length === 4) {
        const [minLon, minLat, maxLon, maxLat] = bboxParts.map(parseFloat);
        conditions.push(`n.longitude >= $${paramIndex} AND n.longitude <= $${paramIndex + 1}`);
        conditions.push(`n.latitude >= $${paramIndex + 2} AND n.latitude <= $${paramIndex + 3}`);
        params.push(minLon, maxLon, minLat, maxLat);
        paramIndex += 4;
      }
    }

    // Text search in comments
    let textSearchJoin = '';
    if (filters.text) {
      textSearchJoin = `
        INNER JOIN public.note_comments nc_search ON n.note_id = nc_search.note_id
      `;
      const searchPattern = `%${filters.text.trim()}%`;
      conditions.push(`nc_search.text ILIKE $${paramIndex}`);
      params.push(searchPattern);
      paramIndex++;
    }

    // Combine conditions with operator
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(` ${operator} `)}` : '';

    // Build main query
    const query = `
      SELECT DISTINCT
        n.note_id,
        n.latitude,
        n.longitude,
        n.status,
        n.created_at,
        n.closed_at,
        n.id_user,
        n.id_country,
        COUNT(DISTINCT nc.comment_id) as comments_count
      FROM public.notes n
      LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
      ${textSearchJoin}
      ${whereClause}
      GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Build count query for pagination
    // For count, we need to handle text search differently
    let countQuery: string;
    let countParams: unknown[];

    if (filters.text) {
      // If text search is used, we need to join with comments for count too
      const countConditions = conditions.filter((c) => !c.includes('nc_search.text'));
      const countWhereClause =
        countConditions.length > 0
          ? `WHERE ${countConditions.join(` ${operator} `)} AND EXISTS (
              SELECT 1 FROM public.note_comments nc_count 
              WHERE nc_count.note_id = n.note_id 
              AND nc_count.text ILIKE $${countConditions.length + 1}
            )`
          : `WHERE EXISTS (
              SELECT 1 FROM public.note_comments nc_count 
              WHERE nc_count.note_id = n.note_id 
              AND nc_count.text ILIKE $1
            )`;

      countQuery = `
        SELECT COUNT(DISTINCT n.note_id) as count
        FROM public.notes n
        ${countWhereClause}
      `;

      if (countConditions.length > 0) {
        countParams = params.slice(0, -2).filter((_, idx) => {
          // Remove the text search param and keep others
          const textParamIndex = conditions.findIndex((c) => c.includes('nc_search.text'));
          return idx !== textParamIndex;
        });
        const searchPattern = `%${filters.text.trim()}%`;
        countParams.push(searchPattern);
      } else {
        const searchPattern = `%${filters.text.trim()}%`;
        countParams = [searchPattern];
      }
    } else {
      countQuery = `
        SELECT COUNT(DISTINCT n.note_id) as count
        FROM public.notes n
        ${whereClause}
      `;
      countParams = params.slice(0, -2); // Remove limit and offset
    }

    logger.debug('Executing advanced search notes query', {
      filters,
      operator,
      page,
      limit,
    });

    const [dataResult, countResult] = await Promise.all([
      pool.query<NoteRow>(query, params),
      pool.query<CountRow>(countQuery, countParams),
    ]);

    const notes: Note[] = dataResult.rows.map((row) => ({
      note_id: row.note_id,
      latitude: typeof row.latitude === 'string' ? parseFloat(row.latitude) : row.latitude,
      longitude: typeof row.longitude === 'string' ? parseFloat(row.longitude) : row.longitude,
      status: row.status as Note['status'],
      created_at: row.created_at,
      closed_at: row.closed_at,
      id_user: row.id_user,
      id_country: row.id_country,
      comments_count:
        typeof row.comments_count === 'string'
          ? parseInt(row.comments_count, 10)
          : row.comments_count || 0,
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

    logger.debug('Advanced search notes completed', {
      filters,
      total,
      page,
      limit,
    });

    return {
      data: notes,
      pagination,
      filters: filters,
    };
  } catch (error) {
    logger.error('Error in advanced search notes', {
      service: 'osm-notes-api',
      filters,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
