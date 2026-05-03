/**
 * Unit tests for noteClassificationMapper (dwh.note_type_classifications row → API DTO).
 */

import {
  mapNoteClassificationRow,
  type NoteClassificationRow,
} from '../../../src/utils/noteClassificationMapper';

describe('noteClassificationMapper', () => {
  const baseTs = new Date('2026-05-02T12:00:00.000Z');
  const updatedTs = new Date('2026-05-03T08:00:00.000Z');

  const fullRow: NoteClassificationRow = {
    id_note: 999001,
    main_category: 'contributes_with_change',
    category_confidence: '0.8000',
    category_method: 'ml_based',
    specific_type: 'adds_to_map',
    type_confidence: 0.75,
    type_probabilities: { adds_to_map: 0.75, modifies_map: 0.25 },
    type_method: 'ml_based',
    recommended_action: 'process',
    action_confidence: '0.82',
    action_method: 'ml_based',
    priority_score: 9,
    classification_version: 'pgml-main-202605',
    classification_timestamp: baseTs,
    updated_at: updatedTs,
    classification_factors: { foo: 1 },
    similar_notes: [100, 101],
    estimated_resolution_time: 48,
  };

  it('maps a full row to NoteMlClassification', () => {
    const dto = mapNoteClassificationRow(fullRow);
    expect(dto).toEqual({
      note_id: 999001,
      main_category: 'contributes_with_change',
      category_confidence: 0.8,
      category_method: 'ml_based',
      specific_type: 'adds_to_map',
      type_confidence: 0.75,
      type_probabilities: { adds_to_map: 0.75, modifies_map: 0.25 },
      type_method: 'ml_based',
      recommended_action: 'process',
      action_confidence: 0.82,
      action_method: 'ml_based',
      priority_score: 9,
      classification_version: 'pgml-main-202605',
      classification_timestamp: baseTs,
      updated_at: updatedTs,
      classification_factors: { foo: 1 },
      similar_notes: [100, 101],
      estimated_resolution_time: 48,
    });
  });

  it('maps null JSON/array extras from DWH', () => {
    const row: NoteClassificationRow = {
      ...fullRow,
      type_probabilities: null,
      classification_factors: null,
      similar_notes: null,
      estimated_resolution_time: null,
    };
    const dto = mapNoteClassificationRow(row);
    expect(dto.type_probabilities).toBeNull();
    expect(dto.classification_factors).toBeNull();
    expect(dto.similar_notes).toBeNull();
    expect(dto.estimated_resolution_time).toBeNull();
  });
});
