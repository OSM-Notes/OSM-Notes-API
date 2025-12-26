/**
 * Note service
 * Handles business logic for notes operations
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { Note, NoteComment, SearchFilters, SearchResult, Pagination } from '../types';

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
        n.id_user,
        n.id_country,
        COUNT(DISTINCT nc.comment_id) as comments_count
      FROM public.notes n
      LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
      WHERE n.note_id = $1
      GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country
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
        nc.comment_id,
        nc.note_id,
        nc.user_id,
        u.username,
        nc.action,
        nc.created_at,
        nct.text
      FROM public.note_comments nc
      LEFT JOIN public.users u ON nc.user_id = u.user_id
      LEFT JOIN public.note_comments_text nct ON nc.comment_id = nct.comment_id
      WHERE nc.note_id = $1
      ORDER BY nc.created_at ASC
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
 * Search notes with filters
 * @param filters - Search filters
 * @returns Search result with notes and pagination
 * @throws ApiError with 500 if database error occurs
 */
export async function searchNotes(filters: SearchFilters): Promise<SearchResult<Note>> {
  const pool = getDatabasePool();

  try {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Build WHERE clause
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
      conditions.push(`n.id_user = $${paramIndex}`);
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build main query
    const query = `
      SELECT
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
      ${whereClause}
      GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country
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
    logger.error('Error searching notes', {
      filters,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Internal server error');
  }
}
