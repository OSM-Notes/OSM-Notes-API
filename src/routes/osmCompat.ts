/**
 * OSM API 0.6 compatibility routes
 * Same paths and query params as api.openstreetmap.org/api/0.6/notes for easy migration.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as osmCompatController from '../controllers/osmCompatController';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// GET /api/0.6/notes/search - search notes (must be before /:id to avoid "search" as id)
router.get('/search', asyncHandler(osmCompatController.searchNotesOsm));

// GET /api/0.6/notes?bbox=... - notes in bounding box
router.get('/', asyncHandler(osmCompatController.getNotesByBbox));

// GET /api/0.6/notes/:id or /api/0.6/notes/:id.json - single note
router.get('/:id', asyncHandler(osmCompatController.getNoteByIdOsm));

export default router;
