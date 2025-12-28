/**
 * Unit tests for advanced search service
 * Following TDD approach - tests written before implementation
 */

import { Pool } from 'pg';
import { getDatabasePool } from '../../../src/config/database';
import * as advancedSearchService from '../../../src/services/advancedSearchService';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  getDatabasePool: jest.fn(),
}));

describe('advancedSearchService', () => {
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

  describe('advancedSearchNotes', () => {
    it('should support multiple filters with AND operator (default)', async () => {
      const filters = {
        country: 1,
        status: 'open' as const,
        user_id: 12345,
        operator: 'AND' as const,
        page: 1,
        limit: 20,
      };

      const mockNotes = [
        {
          note_id: 1,
          latitude: 40.0,
          longitude: -3.0,
          status: 'open',
          created_at: new Date('2024-01-01'),
          closed_at: null,
          id_user: 12345,
          id_country: 1,
          comments_count: 5,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      const result = await advancedSearchService.advancedSearchNotes(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].note_id).toBe(1);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify AND operator is used (all conditions joined with AND)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const firstCall = mockQuery.mock.calls[0];
      if (firstCall && Array.isArray(firstCall) && firstCall.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const queryCall = firstCall[0];
        expect(String(queryCall)).toContain('AND');
      }
    });

    it('should support multiple filters with OR operator', async () => {
      const filters = {
        country: 1,
        status: 'open' as const,
        operator: 'OR' as const,
        page: 1,
        limit: 20,
      };

      const mockNotes = [
        {
          note_id: 1,
          latitude: 40.0,
          longitude: -3.0,
          status: 'open',
          created_at: new Date('2024-01-01'),
          closed_at: null,
          id_user: 12345,
          id_country: 1,
          comments_count: 5,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      const result = await advancedSearchService.advancedSearchNotes(filters);

      expect(result.data).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify OR operator is used
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const firstCall = mockQuery.mock.calls[0];
      if (firstCall && Array.isArray(firstCall) && firstCall.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const queryCall = firstCall[0];
        expect(String(queryCall)).toContain('OR');
      }
    });

    it('should support text search in note comments', async () => {
      const filters = {
        text: 'test comment',
        page: 1,
        limit: 20,
      };

      const mockNotes = [
        {
          note_id: 1,
          latitude: 40.0,
          longitude: -3.0,
          status: 'open',
          created_at: new Date('2024-01-01'),
          closed_at: null,
          id_user: 12345,
          id_country: 1,
          comments_count: 5,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      const result = await advancedSearchService.advancedSearchNotes(filters);

      expect(result.data).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify text search is included in query
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const firstCall = mockQuery.mock.calls[0];
      if (firstCall && Array.isArray(firstCall) && firstCall.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const queryCall = firstCall[0];
        const queryString = String(queryCall).toLowerCase();
        expect(queryString).toContain('text');
        expect(queryString).toContain('comment');
      }
    });

    it('should combine text search with other filters', async () => {
      const filters = {
        text: 'test',
        country: 1,
        status: 'open' as const,
        operator: 'AND' as const,
        page: 1,
        limit: 20,
      };

      const mockNotes: unknown[] = [];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      const result = await advancedSearchService.advancedSearchNotes(filters);

      expect(result.data).toHaveLength(0);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle empty filters gracefully', async () => {
      const filters = {
        page: 1,
        limit: 20,
      };

      const mockNotes: unknown[] = [];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      const result = await advancedSearchService.advancedSearchNotes(filters);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle database errors', async () => {
      const filters = {
        country: 1,
        page: 1,
        limit: 20,
      };

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(advancedSearchService.advancedSearchNotes(filters)).rejects.toThrow(ApiError);
    });

    it('should respect pagination parameters', async () => {
      const filters = {
        country: 1,
        page: 2,
        limit: 10,
      };

      const mockNotes: unknown[] = [];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '25' }],
      });

      const result = await advancedSearchService.advancedSearchNotes(filters);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.total_pages).toBe(3);
    });

    it('should support date range filters', async () => {
      const filters = {
        date_from: '2024-01-01',
        date_to: '2024-12-31',
        page: 1,
        limit: 20,
      };

      const mockNotes: unknown[] = [];

      mockQuery.mockResolvedValueOnce({
        rows: mockNotes,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await advancedSearchService.advancedSearchNotes(filters);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const firstCall = mockQuery.mock.calls[0];
      if (firstCall && Array.isArray(firstCall) && firstCall.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const queryCall = firstCall[0];
        expect(String(queryCall).toLowerCase()).toContain('created_at');
      }
    });
  });
});
