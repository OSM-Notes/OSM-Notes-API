/**
 * Unit tests for noteClassificationService (read-only DWH classifications).
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as noteClassificationService from '../../../src/services/noteClassificationService';
import { ApiError } from '../../../src/middleware/errorHandler';
import type { NoteClassificationRow } from '../../../src/utils/noteClassificationMapper';

jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('noteClassificationService', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = { query: mockQuery } as unknown as jest.Mocked<Pool>;
    (getDatabasePool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no classification row exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await noteClassificationService.getStoredNoteClassification(42);

    expect(result).toBeNull();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM dwh.note_type_classifications'),
      [42]
    );
  });

  it('returns mapped classification for latest row', async () => {
    const ts = new Date('2026-05-02T10:00:00.000Z');
    const row: NoteClassificationRow = {
      id_note: 42,
      main_category: 'doesnt_contribute',
      category_confidence: 0.9,
      category_method: 'ml_based',
      specific_type: 'personal_data',
      type_confidence: 0.88,
      type_probabilities: null,
      type_method: 'ml_based',
      recommended_action: 'close',
      action_confidence: 0.7,
      action_method: 'ml_based',
      priority_score: 3,
      classification_version: null,
      classification_timestamp: ts,
      updated_at: ts,
      classification_factors: null,
      similar_notes: null,
      estimated_resolution_time: null,
    };
    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const result = await noteClassificationService.getStoredNoteClassification(42);

    expect(result).not.toBeNull();
    expect(result!.note_id).toBe(42);
    expect(result!.main_category).toBe('doesnt_contribute');
    expect(result!.priority_score).toBe(3);
  });

  it('throws ApiError 500 on database errors', async () => {
    mockQuery.mockRejectedValueOnce(
      new Error('relation "dwh.note_type_classifications" does not exist')
    );

    let thrown: unknown;
    try {
      await noteClassificationService.getStoredNoteClassification(1);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).statusCode).toBe(500);
  });
});
