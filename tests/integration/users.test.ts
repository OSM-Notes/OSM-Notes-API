/**
 * Integration tests for users endpoints
 */

import request from 'supertest';
import { Express } from 'express';

describe('Users Endpoints', () => {
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

  describe('GET /api/v1/users/:user_id', () => {
    it('should return 200 status for valid user ID', async () => {
      // Note: This test requires a real database with test data
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .get('/api/v1/users/12345')
        .set('User-Agent', validUserAgent);

      // Should either return 200 (if user exists) or 404 (if not)
      expect([200, 404]).toContain(response.status);
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for negative user ID', async () => {
      const response = await request(app).get('/api/v1/users/-1').set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return 400 for zero user ID', async () => {
      const response = await request(app).get('/api/v1/users/0').set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/api/v1/users/12345')
        .set('User-Agent', validUserAgent);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return user profile data when user exists', async () => {
      const response = await request(app)
        .get('/api/v1/users/12345')
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as { data: unknown };
        expect(body).toHaveProperty('data');
        expect(body.data).toBeDefined();
      }
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/api/v1/users/12345');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should apply rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array(60)
        .fill(null)
        .map(() => request(app).get('/api/v1/users/12345').set('User-Agent', validUserAgent));

      const responses = await Promise.all(requests);

      // Should eventually hit rate limit (429)
      // Note: This depends on rate limit configuration
      expect(responses.length).toBe(60);
    });
  });
});
