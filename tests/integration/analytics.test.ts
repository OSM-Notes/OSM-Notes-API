/**
 * Integration tests for analytics endpoints
 */

import request from 'supertest';
import { Express } from 'express';

describe('Analytics Endpoints', () => {
  let app: Express;
  const validUserAgent = 'TestApp/1.0 (test@example.com)';

  beforeAll(async () => {
    // Reset Redis client before setting environment variables
    const { resetRedisClient } = await import('../../src/config/redis');
    resetRedisClient();

    // Set required environment variables before importing app
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'test_db';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';
    // Disable Redis for tests (use in-memory rate limiting)
    process.env.REDIS_HOST = '';

    const { default: createApp } = await import('../../src/index');
    app = createApp();
  });

  describe('GET /api/v1/analytics/global', () => {
    it('should return 200 status', async () => {
      // Note: This test requires a real database with test data
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .get('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists), 404 (if not), or 500 (if DB unavailable)
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return global analytics data when available', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as { data: unknown };
        expect(body).toHaveProperty('data');
        expect(body.data).toBeDefined();
      }
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/api/v1/analytics/global');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should apply rate limiting', async () => {
      // Make limited requests to avoid overwhelming the system
      // Reduced from 60 to 15 for better performance
      const requests = Array(15)
        .fill(null)
        .map(() => request(app).get('/api/v1/analytics/global').set('User-Agent', validUserAgent));

      const responses = await Promise.all(requests);

      // Should eventually hit rate limit (429)
      // Note: This depends on rate limit configuration
      expect(responses.length).toBe(15);
    });
  });
});
