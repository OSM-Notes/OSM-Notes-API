/**
 * Notes controller
 * Handles HTTP requests for notes endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as noteService from '../services/noteService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { SearchFilters } from '../types';

/**
 * Get a note by ID
 * GET /api/v1/notes/:note_id
 */
export async function getNoteById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noteId = parseInt(req.params.note_id, 10);

    if (isNaN(noteId) || noteId <= 0) {
      throw new ApiError(400, 'Invalid note ID');
    }

    logger.debug('Getting note by ID', { noteId });

    const note = await noteService.getNoteById(noteId);

    res.json({
      data: note,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get comments for a note
 * GET /api/v1/notes/:note_id/comments
 */
export async function getNoteComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const noteId = parseInt(req.params.note_id, 10);

    if (isNaN(noteId) || noteId <= 0) {
      throw new ApiError(400, 'Invalid note ID');
    }

    logger.debug('Getting note comments', { noteId });

    const comments = await noteService.getNoteComments(noteId);

    res.json({
      data: comments,
      count: comments.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search notes with filters
 * GET /api/v1/notes
 */
export async function searchNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters: SearchFilters = {
      country: req.query.country ? parseInt(String(req.query.country), 10) : undefined,
      status: req.query.status as 'open' | 'closed' | 'reopened' | undefined,
      hashtag: req.query.hashtag ? String(req.query.hashtag) : undefined,
      date_from: req.query.date_from ? String(req.query.date_from) : undefined,
      date_to: req.query.date_to ? String(req.query.date_to) : undefined,
      user_id: req.query.user_id ? parseInt(String(req.query.user_id), 10) : undefined,
      application: req.query.application ? String(req.query.application) : undefined,
      bbox: req.query.bbox ? String(req.query.bbox) : undefined,
      page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
    };

    // Validate page and limit
    if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
      throw new ApiError(400, 'Invalid page number');
    }

    if (
      filters.limit !== undefined &&
      (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)
    ) {
      throw new ApiError(400, 'Invalid limit (must be between 1 and 100)');
    }

    // Validate status if provided
    if (filters.status && !['open', 'closed', 'reopened'].includes(filters.status)) {
      throw new ApiError(400, 'Invalid status (must be open, closed, or reopened)');
    }

    logger.debug('Searching notes', { filters });

    const result = await noteService.searchNotes(filters);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
