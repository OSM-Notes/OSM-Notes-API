/**
 * Unit tests for noteService
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as noteService from '../../../src/services/noteService';
import { Note, NoteComment, SearchFilters, NoteStatus } from '../../../src/types';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('noteService', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // Create mock query function
    mockQuery = jest.fn();

    // Create mock pool
    mockPool = {
      query: mockQuery,
    } as unknown as jest.Mocked<Pool>;

    // Mock getDatabasePool to return our mock pool
    (getDatabasePool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNoteById', () => {
    it('should return a valid note when note exists', async () => {
      const mockNote: Note = {
        note_id: 12345,
        latitude: 4.6097,
        longitude: -74.0817,
        status: 'open',
        created_at: new Date('2024-01-15T10:30:00Z'),
        closed_at: null,
        id_user: 67890,
        id_country: 42,
        comments_count: 3,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockNote],
        rowCount: 1,
      });

      const result = await noteService.getNoteById(12345);

      expect(result).toEqual(mockNote);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [12345]);
    });

    it('should throw ApiError with 404 when note does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(noteService.getNoteById(99999)).rejects.toThrow(ApiError);
      await expect(noteService.getNoteById(99999)).rejects.toThrow('Note not found');

      try {
        await noteService.getNoteById(99999);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(404);
        }
      }
    });

    it('should handle database errors and throw 500', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(noteService.getNoteById(12345)).rejects.toThrow();

      try {
        await noteService.getNoteById(12345);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(500);
        }
      }
    });
  });

  describe('getNoteComments', () => {
    it('should return comments for a valid note', async () => {
      const mockComments: NoteComment[] = [
        {
          comment_id: 1,
          note_id: 12345,
          user_id: 67890,
          username: 'test_user',
          action: 'opened',
          created_at: new Date('2024-01-15T10:30:00Z'),
          text: 'This is a test note',
        },
        {
          comment_id: 2,
          note_id: 12345,
          user_id: 67891,
          username: 'another_user',
          action: 'commented',
          created_at: new Date('2024-01-15T11:00:00Z'),
          text: 'I can help with this',
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockComments,
        rowCount: 2,
      });

      const result = await noteService.getNoteComments(12345);

      expect(result).toEqual(mockComments);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [12345]);
    });

    it('should return empty array when note has no comments', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await noteService.getNoteComments(12345);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle database errors and throw 500', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(noteService.getNoteComments(12345)).rejects.toThrow();

      try {
        await noteService.getNoteComments(12345);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(500);
        }
      }
    });
  });

  describe('searchNotes', () => {
    it('should return notes with basic filters', async () => {
      const mockNotes: Note[] = [
        {
          note_id: 12345,
          latitude: 4.6097,
          longitude: -74.0817,
          status: 'open',
          created_at: new Date('2024-01-15T10:30:00Z'),
          closed_at: null,
          id_user: 67890,
          id_country: 42,
          comments_count: 3,
        },
        {
          note_id: 12346,
          latitude: 4.61,
          longitude: -74.082,
          status: 'open',
          created_at: new Date('2024-01-16T10:30:00Z'),
          closed_at: null,
          id_user: 67891,
          id_country: 42,
          comments_count: 1,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
        rowCount: 2,
      });

      // Mock count query for pagination
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '2' }],
        rowCount: 1,
      });

      const filters: SearchFilters = {
        country: 42,
        status: 'open',
        page: 1,
        limit: 20,
      };

      const result = await noteService.searchNotes(filters);

      expect(result.data).toEqual(mockNotes);
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(2);
    });

    it('should handle pagination correctly', async () => {
      const mockNotes: Note[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          note_id: 1000 + i,
          latitude: 4.6097,
          longitude: -74.0817,
          status: 'open' as NoteStatus,
          created_at: new Date('2024-01-15T10:30:00Z'),
          closed_at: null,
          id_user: 67890,
          id_country: 42,
          comments_count: 1,
        }));

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
        rowCount: 20,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '50' }],
        rowCount: 1,
      });

      const filters: SearchFilters = {
        page: 1,
        limit: 20,
      };

      const result = await noteService.searchNotes(filters);

      expect(result.data).toHaveLength(20);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.total_pages).toBe(3); // 50 / 20 = 2.5, rounded up = 3
    });

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      });

      const filters: SearchFilters = {
        country: 999,
        page: 1,
        limit: 20,
      };

      const result = await noteService.searchNotes(filters);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.total_pages).toBe(0);
    });

    it('should handle database errors and throw 500', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      const filters: SearchFilters = {
        page: 1,
        limit: 20,
      };

      await expect(noteService.searchNotes(filters)).rejects.toThrow();

      try {
        await noteService.searchNotes(filters);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(500);
        }
      }
    });
  });
});
