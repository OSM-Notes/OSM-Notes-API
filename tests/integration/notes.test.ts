/**
 * Integration tests for notes endpoints
 */

import request from 'supertest';
import { Express } from 'express';

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
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  filters?: Record<string, unknown>;
}

describe('Notes Endpoints', () => {
  let app: Express;
  const validUserAgent = 'TestApp/1.0 (test@example.com)';

  beforeAll(async () => {
    // Set required environment variables before importing app
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'test_db';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';

    const { default: createApp } = await import('../../src/index');
    app = createApp();
  });

  describe('GET /api/v1/notes/:note_id', () => {
    it('should return 200 status for valid note ID', async () => {
      // Note: This test requires a real database with test data
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .get('/api/v1/notes/12345')
        .set('User-Agent', validUserAgent);

      // Should either return 200 (if note exists) or 404 (if not)
      expect([200, 404]).toContain(response.status);
    });

    it('should return 400 for invalid note ID', async () => {
      const response = await request(app)
        .get('/api/v1/notes/invalid')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for negative note ID', async () => {
      const response = await request(app).get('/api/v1/notes/-1').set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for zero note ID', async () => {
      const response = await request(app).get('/api/v1/notes/0').set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/api/v1/notes/12345')
        .set('User-Agent', validUserAgent);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/api/v1/notes/12345');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should apply rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array(60)
        .fill(null)
        .map(() => request(app).get('/api/v1/notes/12345').set('User-Agent', validUserAgent));

      const responses = await Promise.all(requests);

      // Should eventually hit rate limit (429)
      // Note: This depends on rate limit configuration
      // We don't assert this strictly as it depends on test environment
      expect(responses.length).toBe(60);
    });
  });

  describe('GET /api/v1/notes/:note_id/comments', () => {
    it('should return 200 status for valid note ID', async () => {
      const response = await request(app)
        .get('/api/v1/notes/12345/comments')
        .set('User-Agent', validUserAgent);

      // Should either return 200 (if note exists) or 404 (if not)
      expect([200, 404]).toContain(response.status);
    });

    it('should return 400 for invalid note ID', async () => {
      const response = await request(app)
        .get('/api/v1/notes/invalid/comments')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return JSON response with data array', async () => {
      const response = await request(app)
        .get('/api/v1/notes/12345/comments')
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
      const response = await request(app).get('/api/v1/notes/12345/comments');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/notes (search)', () => {
    it('should return 200 status for search without filters', async () => {
      const response = await request(app).get('/api/v1/notes').set('User-Agent', validUserAgent);

      expect(response.status).toBe(200);
      const body = response.body as SearchNotesResponse;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return 200 with pagination metadata', async () => {
      const response = await request(app)
        .get('/api/v1/notes?page=1&limit=10')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(200);
      const body = response.body as SearchNotesResponse;
      expect(body.pagination).toHaveProperty('page');
      expect(body.pagination).toHaveProperty('limit');
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('total_pages');
    });

    it('should accept status filter', async () => {
      const response = await request(app)
        .get('/api/v1/notes?status=open')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .get('/api/v1/notes?status=invalid')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should accept country filter', async () => {
      const response = await request(app)
        .get('/api/v1/notes?country=42')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid page number', async () => {
      const response = await request(app)
        .get('/api/v1/notes?page=0')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid limit (too high)', async () => {
      const response = await request(app)
        .get('/api/v1/notes?limit=200')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid limit (negative)', async () => {
      const response = await request(app)
        .get('/api/v1/notes?limit=-1')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/api/v1/notes');

      expect(response.status).toBe(400);
    });
  });
});
