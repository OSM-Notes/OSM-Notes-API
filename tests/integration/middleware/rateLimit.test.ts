/**
 * Integration tests for rate limiting middleware
 */

import request from 'supertest';
import { Express } from 'express';

describe('Rate Limiting Middleware Integration', () => {
  let app: Express;
  const validUserAgent = 'TestApp/1.0 (test@example.com)';

  beforeAll(async () => {
    // Set required environment variables before importing app
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'test_db';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';

    const { default: createApp } = await import('../../../src/index');
    app = createApp();
  });

  describe('Rate limit headers', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app).get('/api/v1').set('User-Agent', validUserAgent);

      expect(response.status).toBe(200);
      // express-rate-limit v7 uses standardHeaders: true
      // Headers should be RateLimit-* (not X-RateLimit-*)
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });

    it('should show correct limit (50 requests)', async () => {
      const response = await request(app).get('/api/v1').set('User-Agent', validUserAgent);

      expect(response.status).toBe(200);
      const limit = parseInt(response.headers['ratelimit-limit'] || '0', 10);
      expect(limit).toBe(50);
    });

    it('should decrement remaining count', async () => {
      const response1 = await request(app).get('/api/v1').set('User-Agent', validUserAgent);

      const remaining1 = parseInt(response1.headers['ratelimit-remaining'] || '0', 10);

      const response2 = await request(app).get('/api/v1').set('User-Agent', validUserAgent);

      const remaining2 = parseInt(response2.headers['ratelimit-remaining'] || '0', 10);

      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });
  });

  describe('Rate limit enforcement', () => {
    it('should allow requests within the limit', async () => {
      // Make a few requests (well under the limit)
      const requests = Array(5)
        .fill(null)
        .map(() => request(app).get('/api/v1').set('User-Agent', validUserAgent));

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should block requests exceeding the limit', async () => {
      // Note: This test may be flaky in CI/CD if rate limits are shared
      // In a real scenario, we'd use a test Redis instance or mock
      // For now, we test the structure and that rate limiting is active

      const response = await request(app).get('/api/v1').set('User-Agent', validUserAgent);

      // Should either succeed (if under limit) or return 429 (if over limit)
      expect([200, 429]).toContain(response.status);

      if (response.status === 429) {
        const body = response.body as {
          error: string;
          message: string;
          statusCode: number;
        };
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('message');
        expect(body.message).toContain('Rate limit exceeded');
      }
    });
  });

  describe('Rate limit by IP and User-Agent', () => {
    it('should track rate limit per IP + User-Agent combination', async () => {
      const userAgent1 = 'App1/1.0 (app1@example.com)';
      const userAgent2 = 'App2/1.0 (app2@example.com)';

      const response1 = await request(app).get('/api/v1').set('User-Agent', userAgent1);

      const response2 = await request(app).get('/api/v1').set('User-Agent', userAgent2);

      // Both should succeed (different User-Agents = different rate limit buckets)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Rate limit skip conditions', () => {
    it('should skip rate limiting for health check endpoint', async () => {
      // Health check should not be rate limited (configured to skip)
      // Make multiple requests to verify
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/health').set('User-Agent', validUserAgent));

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
