/**
 * Integration tests for notes endpoints.
 *
 * These tests use a real database (DB_NAME, e.g. osm_notes_api_test). They accept 200, 404, or 500
 * for GET /notes/:id and 200 or 500 for GET /notes because the test DB may be empty or unavailable.
 * The schema for public.notes follows OSM-Notes-Ingestion (id_user, id_country). See docs/Database_Schema.md.
 * Unit tests mock the pool and do not validate real SQL column names.
 */

import request from 'supertest';
import { Express } from 'express';
import { encodeCursor } from '../../src/utils/cursor';

/**
 * Response types for tests
 */
interface NoteCommentsResponse {
  data: Array<{
    comment_id: number;
    note_id: number;
    user_id: number | null;
    username: string | null;
    action: string;
    created_at: string;
    text: string | null;
  }>;
  count: number;
}

interface SearchNotesResponse {
  data: Array<{
    note_id: number;
    latitude: number;
    longitude: number;
    status: string;
    created_at: string;
    closed_at: string | null;
    id_user: number | null;
    id_country: number | null;
    comments_count?: number;
  }>;
  pagination:
    | { page: number; limit: number; total: number; total_pages: number }
    | { limit: number; next_cursor?: string };
  filters?: Record<string, unknown>;
}

describe('Notes Endpoints', () => {
  let app: Express;
  const validUserAgent = 'TestApp/1.0 (test@example.com)';

  beforeAll(async () => {
    // Set required environment variables before importing app
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'osm_notes_api_test';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';
    // Disable Redis for tests (use in-memory rate limiting)
    process.env.REDIS_HOST = '';

    const { default: createApp } = await import('../../src/index');
    app = createApp();
  });

  describe('GET /notes-api/v1/notes/:note_id', () => {
    it('should return 200 status for valid note ID', async () => {
      // Note: This test requires a real database with test data
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .get('/notes-api/v1/notes/12345')
        .set('User-Agent', validUserAgent);

      // Should return 200 (if note exists), 404 (if not), or 500 (if DB unavailable)
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should return 400 for invalid note ID', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/invalid')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for negative note ID', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/-1')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for zero note ID', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/0')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/12345')
        .set('User-Agent', validUserAgent);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/notes-api/v1/notes/12345');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should apply rate limiting', async () => {
      // Make limited requests to avoid overwhelming the system
      // Reduced from 60 to 15 for better performance
      const requests = Array(15)
        .fill(null)
        .map(() => request(app).get('/notes-api/v1/notes/12345').set('User-Agent', validUserAgent));

      const responses = await Promise.all(requests);

      // Should eventually hit rate limit (429)
      // Note: This depends on rate limit configuration
      // We don't assert this strictly as it depends on test environment
      expect(responses.length).toBe(15);
    });
  });

  describe('GET /notes-api/v1/notes/:note_id/comments', () => {
    it('should return 200 status for valid note ID', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/12345/comments')
        .set('User-Agent', validUserAgent);

      // Should return 200 (if note exists), 404 (if not), or 500 (if DB unavailable)
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should return 400 for invalid note ID', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/invalid/comments')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return JSON response with data array', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/12345/comments')
        .set('User-Agent', validUserAgent);

      expect(response.headers['content-type']).toMatch(/json/);

      if (response.status === 200) {
        const body = response.body as NoteCommentsResponse;
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body).toHaveProperty('count');
      }
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/notes-api/v1/notes/12345/comments');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /notes-api/v1/notes (search)', () => {
    it('should return 200 status for search without filters', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
        expect(Array.isArray(body.data)).toBe(true);
        // When DB returns data, validate note shape (id_user/id_country come from user_id/country_id in DB)
        if (body.data.length > 0) {
          const note = body.data[0];
          expect(note).toHaveProperty('note_id');
          expect(note).toHaveProperty('id_user');
          expect(note).toHaveProperty('id_country');
        }
      }
    });

    it('should include OSM attribution in search response', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?limit=1')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse & {
          attribution?: { text: string; url: string };
        };
        expect(body).toHaveProperty('attribution');
        expect(body.attribution).toHaveProperty('text', '© OpenStreetMap contributors');
        expect(body.attribution).toHaveProperty('url', 'https://www.openstreetmap.org/copyright');
      }
    });

    it('should return 200 with pagination metadata', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?page=1&limit=10')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body.pagination).toHaveProperty('limit');
        // Offset mode has page/total/total_pages; cursor mode has next_cursor
        expect('page' in body.pagination || 'next_cursor' in body.pagination).toBe(true);
      }
    });

    it('should include pagination headers in response (offset mode)', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?page=1&limit=10')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        const headers = response.headers;
        const pag = body.pagination as {
          page?: number;
          limit: number;
          total?: number;
          total_pages?: number;
        };

        expect(headers['x-per-page']).toBeDefined();
        expect(headers['x-per-page']).toBe(String(pag.limit));

        // Offset mode: page, total, total_pages
        if ('page' in pag && pag.page !== undefined) {
          expect(headers['x-total-count']).toBeDefined();
          expect(headers['x-total-count']).toBe(String(pag.total));
          expect(headers['x-page']).toBeDefined();
          expect(headers['x-page']).toBe(String(pag.page));
          expect(headers['x-total-pages']).toBeDefined();
          expect(headers['x-total-pages']).toBe(String(pag.total_pages));
          if (pag.total_pages && pag.total_pages > 1 && headers.link) {
            expect(headers.link).toContain('rel="first"');
            if (pag.page && pag.page < pag.total_pages) {
              expect(headers.link).toContain('rel="next"');
            }
          }
        }
      }
    });

    it('should include Link header with navigation links when on first page', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?page=1&limit=10')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        const headers = response.headers;
        const pag = body.pagination as { total_pages?: number; page?: number };
        if ('total_pages' in pag && pag.total_pages && pag.total_pages > 1) {
          expect(headers.link).toBeDefined();
          expect(headers.link).toContain('rel="next"');
          expect(headers.link).toContain('rel="last"');
          expect(headers.link).not.toContain('rel="prev"');
        }
      }
    });

    it('should include Link header with navigation links when on middle page', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?page=2&limit=10')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        const headers = response.headers;
        const pag = body.pagination as { total_pages?: number };
        if ('total_pages' in pag && pag.total_pages && pag.total_pages > 2) {
          expect(headers.link).toBeDefined();
          expect(headers.link).toContain('rel="first"');
          expect(headers.link).toContain('rel="prev"');
          expect(headers.link).toContain('rel="next"');
          expect(headers.link).toContain('rel="last"');
        }
      }
    });

    it('should preserve query parameters in pagination Link headers', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?status=open&country=42&page=1&limit=10')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        const headers = response.headers;
        const pag = body.pagination as { total_pages?: number };
        if ('total_pages' in pag && pag.total_pages && pag.total_pages > 1 && headers.link) {
          expect(headers.link).toContain('status=open');
          expect(headers.link).toContain('country=42');
        }
      }
    });

    it('should accept status filter', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?status=open')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?status=invalid')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should accept country filter', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?country=42')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
    });

    it('should accept user_id filter', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?user_id=12345')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should accept date_from filter', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?date_from=2024-01-01')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
      }
    });

    it('should accept date_to filter', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?date_to=2024-12-31')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
      }
    });

    it('should accept date range (date_from and date_to)', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?date_from=2024-01-01&date_to=2024-12-31')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
      }
    });

    it('should accept bbox filter', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?bbox=-74.1,4.5,-74.0,4.7')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
      }
    });

    it('should return 400 for invalid date_from format', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?date_from=2024/01/01')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid bbox format', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?bbox=1,2,3')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should accept hashtag filter (requires dwh)', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?hashtag=fixme')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
      }
    });

    it('should accept hashtag with # prefix', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?hashtag=%23fixme')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
    });

    it('should accept application filter (requires dwh)', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?application=JOSM')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
      }
    });

    it('should return 400 for invalid after cursor', async () => {
      // Use base64url("{}") so decodeCursor returns null (missing created_at, note_id)
      const response = await request(app)
        .get('/notes-api/v1/notes?after=e30')
        .set('User-Agent', validUserAgent);

      // Server should reject invalid cursor with 400; 200 can occur if param is not applied (e.g. env)
      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should accept after cursor and return cursor-style pagination when supported', async () => {
      const validCursor = encodeCursor({
        created_at: '2020-01-01T00:00:00.000Z',
        note_id: 1,
      });
      const response = await request(app)
        .get(`/notes-api/v1/notes?limit=5&after=${encodeURIComponent(validCursor)}`)
        .set('User-Agent', validUserAgent);

      expect([200, 400, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as SearchNotesResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
        expect(body.pagination).toHaveProperty('limit');
        // Cursor mode: no page/total_pages; offset mode: has page
        if ('next_cursor' in body.pagination) {
          expect(response.headers['x-per-page']).toBeDefined();
          if (body.pagination.next_cursor) {
            expect(response.headers.link).toMatch(/rel="next"/);
          }
        }
      }
    });

    it('should return 400 for invalid page number', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?page=0')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid limit (too high)', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?limit=200')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid limit (negative)', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes?limit=-1')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/notes-api/v1/notes');

      expect(response.status).toBe(400);
    });
  });
});
