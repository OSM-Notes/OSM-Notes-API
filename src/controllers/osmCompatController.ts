/**
 * OSM API 0.6 compatibility controller
 * Exposes notes in OSM 0.6 format (GeoJSON) for easy transition from api.openstreetmap.org
 */

import { Request, Response, NextFunction } from 'express';
import * as noteService from '../services/noteService';
import * as advancedSearchService from '../services/advancedSearchService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  getOsmNotesBaseUrl,
  noteToOsmFeature,
  notesToOsmFeatureCollection,
} from '../utils/osmNoteFormat';
import type { SearchFilters } from '../types';
import type { NoteComment } from '../types';
import { OSM_ATTRIBUTION } from '../constants/attribution';

/**
 * GET /api/0.6/notes?bbox=...&limit=...&closed=...
 * Notes in bounding box (OSM 0.6 compatible)
 */
export async function getNotesByBbox(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bbox = req.query.bbox as string | undefined;
    if (!bbox) {
      throw new ApiError(400, 'The bbox parameter is required');
    }
    const parts = bbox.split(',');
    if (parts.length !== 4) {
      throw new ApiError(400, 'bbox must be left,bottom,right,top (4 values)');
    }
    const [left, bottom, right, top] = parts.map(parseFloat);
    if ([left, bottom, right, top].some(Number.isNaN)) {
      throw new ApiError(400, 'bbox values must be valid numbers');
    }
    // OSM bbox is left,bottom,right,top; our filters use min_lon,min_lat,max_lon,max_lat
    const bboxStr = `${left},${bottom},${right},${top}`;

    const limitParamBbox = req.query.limit as string | undefined;
    const limit =
      limitParamBbox !== undefined
        ? Math.min(Math.max(1, parseInt(limitParamBbox, 10) || 100), 10000)
        : 100;
    const limitForService = Math.min(limit, 100);

    const closedParamBbox = req.query.closed as string | undefined;
    let status: 'open' | 'closed' | 'reopened' | undefined;
    if (closedParamBbox !== undefined) {
      const closed = parseInt(closedParamBbox, 10);
      if (Number.isNaN(closed)) {
        throw new ApiError(400, 'closed must be a number (0=open only, -1=all)');
      }
      if (closed === 0) status = 'open';
      // closed=7 etc.: include closed notes; we don't filter by "days closed", so we treat as "all"
    }

    const filters: SearchFilters = {
      bbox: bboxStr,
      limit: limitForService,
      page: 1,
      ...(status && { status }),
    };

    const result = await noteService.searchNotes(filters);
    const baseUrl = getOsmNotesBaseUrl(req);

    const commentsByNoteId = new Map<number, NoteComment[]>();
    await Promise.all(
      result.data.map(async (note) => {
        const comments = await noteService.getNoteComments(note.note_id);
        commentsByNoteId.set(note.note_id, comments);
      })
    );

    const fc = notesToOsmFeatureCollection(result.data, commentsByNoteId, baseUrl);
    res.json({ ...fc, attribution: OSM_ATTRIBUTION });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/0.6/notes/search?q=...&user=...&display_name=...&bbox=...&closed=...&limit=...&sort=...&order=...
 * Search notes (OSM 0.6 compatible)
 */
export async function searchNotesOsm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const q = (req.query.q as string)?.trim();
    const user = req.query.user as string | undefined;
    const display_name = req.query.display_name as string | undefined;
    const bbox = req.query.bbox as string | undefined;
    const closedParamSearch = req.query.closed as string | undefined;
    const limitParamSearch = req.query.limit as string | undefined;
    const limit =
      limitParamSearch !== undefined
        ? Math.min(Math.max(1, parseInt(limitParamSearch, 10) || 100), 10000)
        : 100;
    const limitForService = Math.min(limit, 100);

    let status: 'open' | 'closed' | 'reopened' | undefined;
    if (closedParamSearch !== undefined) {
      const closed = parseInt(closedParamSearch, 10);
      if (!Number.isNaN(closed) && closed === 0) status = 'open';
    }

    if (q && q.length > 0) {
      const filters = {
        text: q,
        user_id: user ? parseInt(user, 10) : undefined,
        bbox: bbox || undefined,
        status,
        limit: limitForService,
        page: 1,
        operator: 'AND' as const,
      };
      if (display_name) {
        logger.warn('OSM compat: display_name search not implemented, use user id');
      }
      const result = await advancedSearchService.advancedSearchNotes(filters);
      const baseUrl = getOsmNotesBaseUrl(req);
      const commentsByNoteId = new Map<number, NoteComment[]>();
      await Promise.all(
        result.data.map(async (note) => {
          const comments = await noteService.getNoteComments(note.note_id);
          commentsByNoteId.set(note.note_id, comments);
        })
      );
      const fc = notesToOsmFeatureCollection(result.data, commentsByNoteId, baseUrl);
      res.json({ ...fc, attribution: OSM_ATTRIBUTION });
      return;
    }

    const filters: SearchFilters = {
      user_id: user ? parseInt(user, 10) : undefined,
      bbox: bbox || undefined,
      status,
      limit: limitForService,
      page: 1,
    };
    const result = await noteService.searchNotes(filters);
    const baseUrl = getOsmNotesBaseUrl(req);
    const commentsByNoteId = new Map<number, NoteComment[]>();
    await Promise.all(
      result.data.map(async (note) => {
        const comments = await noteService.getNoteComments(note.note_id);
        commentsByNoteId.set(note.note_id, comments);
      })
    );
    const fc = notesToOsmFeatureCollection(result.data, commentsByNoteId, baseUrl);
    res.json({ ...fc, attribution: OSM_ATTRIBUTION });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/0.6/notes/:id or GET /api/0.6/notes/:id.json
 * Single note by ID (OSM 0.6 compatible)
 */
export async function getNoteByIdOsm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let idParam = req.params.id;
    if (typeof idParam === 'string' && idParam.endsWith('.json')) {
      idParam = idParam.slice(0, -5);
    }
    const noteId = parseInt(idParam, 10);
    if (Number.isNaN(noteId) || noteId <= 0) {
      throw new ApiError(400, 'Invalid note ID');
    }

    const note = await noteService.getNoteById(noteId);
    const comments = await noteService.getNoteComments(noteId);
    const baseUrl = getOsmNotesBaseUrl(req);
    const feature = noteToOsmFeature(note, comments, baseUrl);
    const fc = {
      type: 'FeatureCollection' as const,
      features: [feature],
      attribution: OSM_ATTRIBUTION,
    };
    res.json(fc);
  } catch (error) {
    next(error);
  }
}
