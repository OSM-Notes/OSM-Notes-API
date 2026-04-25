/**
 * Note service
 * Handles business logic for notes operations
 */

import type { Pool } from 'pg';
import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  Note,
  NoteComment,
  SearchFilters,
  SearchResult,
  Pagination,
  CursorSearchResult,
  CursorPagination,
} from '../types';
import { decodeCursor, buildNextCursor, CursorData } from '../utils/cursor';

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
 * Database row type for note comment query result
 */
interface NoteCommentRow {
  comment_id: number;
  note_id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  created_at: Date;
  text: string | null;
}

/**
 * Database row type for count query result
 */
interface CountRow {
  count: string | number;
}

/**
 * Get a note by ID
 * @param noteId - The note ID
 * @returns The note object
 * @throws ApiError with 404 if note not found
 * @throws ApiError with 500 if database error occurs
 */
export async function getNoteById(noteId: number): Promise<Note> {
  const pool = getDatabasePool();

  try {
    const query = `
      SELECT
        n.note_id,
        n.latitude,
        n.longitude,
        n.status,
        n.created_at,
        n.closed_at,
        (SELECT nc1.id_user FROM public.note_comments nc1 WHERE nc1.note_id = n.note_id ORDER BY nc1.sequence_action ASC NULLS LAST LIMIT 1) AS id_user,
        n.id_country,
        COUNT(DISTINCT nc.id) as comments_count
      FROM public.notes n
      LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
      WHERE n.note_id = $1
      GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_country
    `;

    logger.debug('Executing query to get note by ID', { noteId });

    const result = await pool.query<NoteRow>(query, [noteId]);

    if (result.rows.length === 0) {
      logger.warn('Note not found', { noteId });
      throw new ApiError(404, 'Note not found');
    }

    const row = result.rows[0];
    const note: Note = {
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
          : row.comments_count,
    };

    logger.debug('Note retrieved successfully', { noteId, status: note.status });

    return note;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error getting note by ID', {
      noteId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}

/**
 * Get comments for a note
 * @param noteId - The note ID
 * @returns Array of note comments
 * @throws ApiError with 500 if database error occurs
 */
export async function getNoteComments(noteId: number): Promise<NoteComment[]> {
  const pool = getDatabasePool();

  try {
    const query = `
      SELECT
        nc.id AS comment_id,
        nc.note_id,
        nc.id_user AS user_id,
        u.username,
        nc.event AS action,
        nc.created_at,
        nct.body AS text
      FROM public.note_comments nc
      LEFT JOIN public.users u ON nc.id_user = u.user_id
      LEFT JOIN public.note_comments_text nct ON nct.note_id = nc.note_id AND nct.sequence_action = nc.sequence_action
      WHERE nc.note_id = $1
      ORDER BY nc.sequence_action ASC NULLS LAST, nc.created_at ASC
    `;

    logger.debug('Executing query to get note comments', { noteId });

    const result = await pool.query<NoteCommentRow>(query, [noteId]);

    const comments: NoteComment[] = result.rows.map((row) => ({
      comment_id: row.comment_id,
      note_id: row.note_id,
      user_id: row.user_id,
      username: row.username,
      action: row.action,
      created_at: row.created_at,
      text: row.text,
    }));

    logger.debug('Note comments retrieved successfully', {
      noteId,
      commentsCount: comments.length,
    });

    return comments;
  } catch (error) {
    logger.error('Error getting note comments', {
      noteId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}

/**
 * Build WHERE conditions and params for note search (shared by offset and cursor mode).
 */
function buildSearchConditions(
  filters: SearchFilters,
  cursor: CursorData | null
): { conditions: string[]; params: unknown[]; paramIndex: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.country !== undefined) {
    conditions.push(`n.id_country = $${paramIndex}`);
    params.push(filters.country);
    paramIndex++;
  }
  if (filters.status) {
    conditions.push(`n.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }
  if (filters.user_id !== undefined) {
    conditions.push(
      `EXISTS (SELECT 1 FROM public.note_comments nc_f WHERE nc_f.note_id = n.note_id AND nc_f.id_user = $${paramIndex})`
    );
    params.push(filters.user_id);
    paramIndex++;
  }
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
  if (filters.hashtag && filters.hashtag.trim().length > 0) {
    const cleanHashtag = filters.hashtag.trim().replace(/^#/, '');
    conditions.push(`(
      EXISTS (
        SELECT 1 FROM dwh.datamartUsers du
        WHERE du.user_id = (SELECT nc1.id_user FROM public.note_comments nc1 WHERE nc1.note_id = n.note_id ORDER BY nc1.sequence_action ASC NULLS LAST LIMIT 1)
        AND du.hashtags IS NOT NULL AND jsonb_typeof(du.hashtags::jsonb) = 'array'
        AND $${paramIndex} = ANY(SELECT jsonb_array_elements_text(du.hashtags::jsonb))
      )
      OR EXISTS (
        SELECT 1 FROM dwh.datamartCountries dc
        WHERE dc.country_id = n.id_country
        AND dc.hashtags IS NOT NULL AND jsonb_typeof(dc.hashtags::jsonb) = 'array'
        AND $${paramIndex} = ANY(SELECT jsonb_array_elements_text(dc.hashtags::jsonb))
      )
    )`);
    params.push(cleanHashtag);
    paramIndex++;
  }
  if (filters.application && filters.application.trim().length > 0) {
    const application = filters.application.trim();
    conditions.push(`EXISTS (
      SELECT 1 FROM dwh.datamartUsers du
      WHERE du.user_id = (SELECT nc1.id_user FROM public.note_comments nc1 WHERE nc1.note_id = n.note_id ORDER BY nc1.sequence_action ASC NULLS LAST LIMIT 1)
      AND du.applications_used IS NOT NULL AND jsonb_typeof(du.applications_used::jsonb) = 'array'
      AND $${paramIndex} = ANY(SELECT jsonb_array_elements_text(du.applications_used::jsonb))
    )`);
    params.push(application);
    paramIndex++;
  }
  if (cursor) {
    conditions.push(
      `(n.created_at < $${paramIndex}::timestamp OR (n.created_at = $${paramIndex}::timestamp AND n.note_id < $${paramIndex + 1}))`
    );
    params.push(cursor.created_at, cursor.note_id);
    paramIndex += 2;
  }
  return { conditions, params, paramIndex };
}

/**
 * Run keyset (cursor) pagination search. Uses same filters as searchNotes but no count query.
 */
async function runCursorSearch(
  pool: Pool,
  filters: SearchFilters,
  limit: number,
  decoded: CursorData
): Promise<CursorSearchResult<Note>> {
  const { conditions, params, paramIndex } = buildSearchConditions(filters, decoded);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      n.note_id,
      n.latitude,
      n.longitude,
      n.status,
      n.created_at,
      n.closed_at,
      (SELECT nc1.id_user FROM public.note_comments nc1 WHERE nc1.note_id = n.note_id ORDER BY nc1.sequence_action ASC NULLS LAST LIMIT 1) AS id_user,
      n.id_country,
      COUNT(DISTINCT nc.id) as comments_count
    FROM public.notes n
    LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
    ${whereClause}
    GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_country
    ORDER BY n.created_at DESC, n.note_id DESC
    LIMIT $${paramIndex}
  `;
  const queryParams = [...params, limit];

  const dataResult = await pool.query<NoteRow>(query, queryParams);
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

  const next_cursor = buildNextCursor(notes, limit);
  const pagination: CursorPagination = { limit, next_cursor };

  logger.debug('Cursor search notes completed', {
    filters,
    resultsCount: notes.length,
    hasNext: !!next_cursor,
  });

  return { data: notes, pagination, filters };
}

/**
 * Search notes with filters (supports page/offset and cursor-based pagination).
 * When `filters.after` is set, cursor mode is used and `page` is ignored.
 *
 * @param filters - Search filters
 * @returns Search result with notes and pagination (offset or cursor)
 * @throws ApiError with 400 if cursor is invalid, 500 if database error occurs
 */
export async function searchNotes(
  filters: SearchFilters
): Promise<SearchResult<Note> | CursorSearchResult<Note>> {
  const pool = getDatabasePool();

  try {
    const limit = Math.min(filters.limit || 20, 100); // Max 100 per page

    // Cursor mode: validate cursor and use keyset pagination
    if (filters.after !== undefined && filters.after.trim() !== '') {
      const decoded = decodeCursor(filters.after.trim());
      if (!decoded) {
        throw new ApiError(400, 'Invalid cursor');
      }
      return runCursorSearch(pool, filters, limit, decoded);
    }

    // Page/offset mode
    const page = filters.page || 1;
    const offset = (page - 1) * limit;

    const { conditions, params, paramIndex } = buildSearchConditions(filters, null);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build main query (id_user from first comment - Ingestion schema has no id_user on notes)
    const query = `
      SELECT
        n.note_id,
        n.latitude,
        n.longitude,
        n.status,
        n.created_at,
        n.closed_at,
        (SELECT nc1.id_user FROM public.note_comments nc1 WHERE nc1.note_id = n.note_id ORDER BY nc1.sequence_action ASC NULLS LAST LIMIT 1) AS id_user,
        n.id_country,
        COUNT(DISTINCT nc.id) as comments_count
      FROM public.notes n
      LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
      ${whereClause}
      GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_country
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Build count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT n.note_id) as count
      FROM public.notes n
      ${whereClause}
    `;

    logger.debug('Executing search notes query', { filters, page, limit });

    const [dataResult, countResult] = await Promise.all([
      pool.query<NoteRow>(query, params),
      pool.query<CountRow>(countQuery, params.slice(0, -2)), // Remove limit and offset from count query
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

    logger.debug('Search notes completed', {
      filters,
      resultsCount: notes.length,
      total,
    });

    return {
      data: notes,
      pagination,
      filters,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error searching notes', {
      filters,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
