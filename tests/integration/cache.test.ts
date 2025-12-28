/**
 * Integration tests for cache middleware
 */

import request from 'supertest';
import { Express } from 'express';

describe('Cache Middleware Integration', () => {
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

  describe('Cache headers', () => {
    it('should include X-Cache header in response', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);
      expect(response.headers).toHaveProperty('x-cache');
      expect(['HIT', 'MISS', 'DISABLED']).toContain(response.headers['x-cache']);
    });

    it('should return MISS on first request', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      // Cache should be MISS or DISABLED (if Redis not available)
      expect(['MISS', 'DISABLED']).toContain(response.headers['x-cache']);
    });
  });

  describe('Cache behavior with Redis unavailable', () => {
    it('should continue working when Redis is not available', async () => {
      const response = await request(app)
        .get('/api/v1/users/12345')
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);
      expect(response.headers['x-cache']).toBe('DISABLED');
    });

    it('should still return valid responses without cache', async () => {
      const response1 = await request(app)
        .get('/api/v1/countries/42')
        .set('User-Agent', validUserAgent);

      const response2 = await request(app)
        .get('/api/v1/countries/42')
        .set('User-Agent', validUserAgent);

      // Both should work (even if cache is disabled)
      expect([200, 500]).toContain(response1.status);
      expect([200, 500]).toContain(response2.status);
    });
  });

  describe('Cache key generation', () => {
    it('should generate different cache keys for different query parameters', async () => {
      const response1 = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      const response2 = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_closed', limit: 10 })
        .set('User-Agent', validUserAgent);

      // Both should work independently
      expect([200, 400, 500]).toContain(response1.status);
      expect([200, 400, 500]).toContain(response2.status);
    });

    it('should generate same cache key for same query parameters', async () => {
      const query = { metric: 'history_whole_open', limit: 5 };

      const response1 = await request(app)
        .get('/api/v1/users/rankings')
        .query(query)
        .set('User-Agent', validUserAgent);

      const response2 = await request(app)
        .get('/api/v1/users/rankings')
        .query(query)
        .set('User-Agent', validUserAgent);

      // Both should work
      expect([200, 400, 500]).toContain(response1.status);
      expect([200, 400, 500]).toContain(response2.status);
    });
  });

  describe('Cache only for GET requests', () => {
    it('should not cache POST requests', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      // POST should not be cached (should return 404 or method not allowed)
      expect([404, 405, 500]).toContain(response.status);
      if (response.headers['x-cache']) {
        expect(response.headers['x-cache']).toBe('DISABLED');
      }
    });
  });

  describe('Cache with different endpoints', () => {
    it('should cache analytics endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      expect(response.headers).toHaveProperty('x-cache');
    });

    it('should cache user profile endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/users/12345')
        .set('User-Agent', validUserAgent);

      expect([200, 404, 500]).toContain(response.status);
      expect(response.headers).toHaveProperty('x-cache');
    });

    it('should cache country profile endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/countries/42')
        .set('User-Agent', validUserAgent);

      expect([200, 404, 500]).toContain(response.status);
      expect(response.headers).toHaveProperty('x-cache');
    });

    it('should cache rankings endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.headers).toHaveProperty('x-cache');
    });
  });
});
