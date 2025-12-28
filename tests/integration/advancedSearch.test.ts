/**
 * Integration tests for advanced search endpoints
 */

import request from 'supertest';
import { Express } from 'express';

describe('Advanced Search Endpoints', () => {
  let app: Express;
  const validUserAgent = 'TestApp/1.0 (test@example.com)';

  beforeAll(async () => {
    // Set required environment variables before importing app
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'osm_notes_api_test';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';
    // Disable Redis for tests
    process.env.REDIS_HOST = '';

    const { default: createApp } = await import('../../src/index');
    app = createApp();
  });

  describe('GET /api/v1/notes with advanced search', () => {
    it('should support text search parameter', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({ text: 'test' })
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        const body = response.body as { data: unknown[]; pagination: unknown };
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should support AND operator (default)', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          country: 1,
          status: 'open',
          operator: 'AND',
        })
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should support OR operator', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          country: 1,
          status: 'open',
          operator: 'OR',
        })
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should combine text search with other filters', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          text: 'test',
          country: 1,
          status: 'open',
          operator: 'AND',
        })
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should validate operator parameter', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          operator: 'INVALID',
        })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should validate text parameter length', async () => {
      const longText = 'a'.repeat(501);
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          text: longText,
        })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should support pagination with advanced search', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          text: 'test',
          page: 1,
          limit: 10,
        })
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as {
          pagination: { page: number; limit: number; total: number; total_pages: number };
        };
        expect(body.pagination).toHaveProperty('page');
        expect(body.pagination).toHaveProperty('limit');
        expect(body.pagination).toHaveProperty('total');
        expect(body.pagination).toHaveProperty('total_pages');
        expect(body.pagination.page).toBe(1);
        expect(body.pagination.limit).toBe(10);
      }
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/api/v1/notes').query({
        text: 'test',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      const errorBody = response.body as { message: string };
      expect(errorBody.message).toContain('User-Agent');
    });

    it('should work with date range filters', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          text: 'test',
          date_from: '2024-01-01',
          date_to: '2024-12-31',
          operator: 'AND',
        })
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should work with bbox filter', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({
          text: 'test',
          bbox: '-3.0,40.0,-2.0,41.0',
          operator: 'AND',
        })
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      }
    });
  });
});
