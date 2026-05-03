/**
 * Read-only access to stored DWH note classifications.
 *
 * Requires OSM-Notes-Analytics DDL for `dwh.note_type_classifications` and batch jobs
 * (`ml_batch_classify.sh` / `dwh.predict_note_classification_pgml`) to populate rows.
 * Deploy Analytics DWH artifacts before relying on this endpoint.
 */

import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import type { NoteMlClassification } from '../types';
import {
  mapNoteClassificationRow,
  type NoteClassificationRow,
} from '../utils/noteClassificationMapper';

const SELECT_CLASSIFICATION = `
  SELECT
    id_note,
    main_category,
    category_confidence,
    category_method,
    specific_type,
    type_confidence,
    type_probabilities,
    type_method,
    recommended_action,
    action_confidence,
    action_method,
    priority_score,
    classification_version,
    classification_timestamp,
    updated_at,
    classification_factors,
    similar_notes,
    estimated_resolution_time
  FROM dwh.note_type_classifications
  WHERE id_note = $1
  ORDER BY classification_timestamp DESC NULLS LAST, classification_id DESC
  LIMIT 1
`;

/**
 * Latest stored classification for an OSM note id, or null if missing.
 */
export async function getStoredNoteClassification(
  noteId: number
): Promise<NoteMlClassification | null> {
  const pool = getDatabasePool();

  try {
    const result = await pool.query<NoteClassificationRow>(SELECT_CLASSIFICATION, [noteId]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapNoteClassificationRow(result.rows[0]);
  } catch (error) {
    logger.error('Error loading note classification from DWH', {
      noteId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError(500, 'Internal server error');
  }
}
