/**
 * Maps `dwh.note_type_classifications` query rows to API DTOs.
 * Column types follow OSM-Notes-Analytics `sql/dwh/ml/ml_00_note_type_classifications.sql`.
 */

import type { NoteMlClassification } from '../types';

/** Row shape from explicit SELECT on dwh.note_type_classifications */
export interface NoteClassificationRow {
  id_note: number;
  main_category: string;
  category_confidence: string | number;
  category_method: string;
  specific_type: string;
  type_confidence: string | number;
  type_probabilities: Record<string, unknown> | null;
  type_method: string;
  recommended_action: string;
  action_confidence: string | number;
  action_method: string;
  priority_score: string | number;
  classification_version: string | null;
  classification_timestamp: Date;
  updated_at: Date;
  classification_factors: Record<string, unknown> | null;
  similar_notes: number[] | null;
  estimated_resolution_time: number | string | null;
}

function toFloat(v: string | number): number {
  if (typeof v === 'number') {
    return v;
  }
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function toInt(v: string | number): number {
  if (typeof v === 'number') {
    return Math.trunc(v);
  }
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function toIntOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === 'number') {
    return Number.isFinite(v) ? Math.trunc(v) : null;
  }
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function mapNoteClassificationRow(row: NoteClassificationRow): NoteMlClassification {
  return {
    note_id: row.id_note,
    main_category: row.main_category,
    category_confidence: toFloat(row.category_confidence),
    category_method: row.category_method,
    specific_type: row.specific_type,
    type_confidence: toFloat(row.type_confidence),
    type_probabilities: row.type_probabilities,
    type_method: row.type_method,
    recommended_action: row.recommended_action,
    action_confidence: toFloat(row.action_confidence),
    action_method: row.action_method,
    priority_score: toInt(row.priority_score),
    classification_version: row.classification_version,
    classification_timestamp: row.classification_timestamp,
    updated_at: row.updated_at,
    classification_factors: row.classification_factors,
    similar_notes: row.similar_notes,
    estimated_resolution_time: toIntOrNull(row.estimated_resolution_time ?? null),
  };
}
