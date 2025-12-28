/**
 * Notes controller
 * Handles HTTP requests for notes endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as noteService from '../services/noteService';
import * as advancedSearchService from '../services/advancedSearchService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { SearchFilters, AdvancedSearchFilters } from '../types';
import { validateSearchFilters } from '../middleware/validation';
import { setPaginationHeaders } from '../utils/pagination';

/**
 * @swagger
 * /api/v1/notes/{note_id}:
 *   get:
 *     summary: Get a note by ID
 *     tags: [Notes]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: path
 *         name: note_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: OSM note ID
 *     responses:
 *       200:
 *         description: Note details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Note'
 *       400:
 *         description: Invalid note ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/notes/{note_id}/comments:
 *   get:
 *     summary: Get comments for a note
 *     tags: [Notes]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: path
 *         name: note_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: OSM note ID
 *     responses:
 *       200:
 *         description: List of note comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NoteComment'
 *                 count:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: Invalid note ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/notes:
 *   get:
 *     summary: Search notes with filters (supports advanced search with text and logical operators)
 *     tags: [Notes]
 *     description: |
 *       Basic search supports standard filters. Advanced search is automatically enabled when
 *       `text` or `operator` parameters are provided, allowing text search in comments and
 *       logical operators (AND/OR) to combine filters.
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: integer
 *         description: Filter by country ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed, reopened]
 *         description: Filter by status
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes created from this date (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes created until this date (YYYY-MM-DD)
 *       - in: query
 *         name: bbox
 *         schema:
 *           type: string
 *         description: Bounding box (min_lon,min_lat,max_lon,max_lat)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Results per page
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         description: Search for text in note comments (enables advanced search)
 *       - in: query
 *         name: operator
 *         schema:
 *           type: string
 *           enum: [AND, OR]
 *           default: AND
 *         description: Logical operator to combine filters (enables advanced search)
 *     responses:
 *       200:
 *         description: Search results with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Note'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 filters:
 *                   type: object
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function searchNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Validate filters using Joi schema (throws ApiError if invalid)
    // This will throw if validation fails, which will be caught by error handler
    validateSearchFilters(req, res, () => {
      // Validation passed, continue
    });

    // Check if advanced search is requested (text or operator parameter)
    const useAdvancedSearch = req.query.text || req.query.operator;

    if (useAdvancedSearch) {
      // Use advanced search service
      const filters: AdvancedSearchFilters = {
        country: req.query.country ? parseInt(String(req.query.country), 10) : undefined,
        status: req.query.status as 'open' | 'closed' | 'reopened' | undefined,
        date_from: req.query.date_from ? String(req.query.date_from) : undefined,
        date_to: req.query.date_to ? String(req.query.date_to) : undefined,
        user_id: req.query.user_id ? parseInt(String(req.query.user_id), 10) : undefined,
        bbox: req.query.bbox ? String(req.query.bbox) : undefined,
        text: req.query.text ? String(req.query.text) : undefined,
        operator: (req.query.operator as 'AND' | 'OR') || 'AND',
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
      };

      logger.debug('Advanced searching notes', { filters });

      const result = await advancedSearchService.advancedSearchNotes(filters);

      // Set pagination headers
      setPaginationHeaders(res, result.pagination, '/api/v1/notes', {
        ...filters,
      });

      res.json(result);
      return;
    }

    // Use standard search service
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

    logger.debug('Searching notes', { filters });

    const result = await noteService.searchNotes(filters);

    // Set pagination headers
    setPaginationHeaders(res, result.pagination, '/api/v1/notes', {
      country: filters.country,
      status: filters.status,
      hashtag: filters.hashtag,
      date_from: filters.date_from,
      date_to: filters.date_to,
      user_id: filters.user_id,
      application: filters.application,
      bbox: filters.bbox,
      limit: filters.limit,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
