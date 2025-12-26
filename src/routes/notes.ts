/**
 * Notes routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as notesController from '../controllers/notesController';

const router = Router();

/**
 * Async wrapper for route handlers
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * @route   GET /api/v1/notes
 * @desc    Search notes with filters
 * @access  Public
 */
router.get('/', asyncHandler(notesController.searchNotes));

/**
 * @route   GET /api/v1/notes/:note_id
 * @desc    Get a note by ID
 * @access  Public
 */
router.get('/:note_id', asyncHandler(notesController.getNoteById));

/**
 * @route   GET /api/v1/notes/:note_id/comments
 * @desc    Get comments for a note
 * @access  Public
 */
router.get('/:note_id/comments', asyncHandler(notesController.getNoteComments));

export default router;
