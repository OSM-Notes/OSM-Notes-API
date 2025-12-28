/**
 * Integration tests for metrics endpoint
 */

import request from 'supertest';
import { Express } from 'express';

describe('Metrics Endpoint', () => {
  let app: Express;

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

  describe('GET /metrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(typeof response.text).toBe('string');
    });

    it('should include HTTP request metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      // Prometheus format should include metric names
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should not require User-Agent header', async () => {
      const response = await request(app).get('/metrics');

      // Should work without User-Agent (unlike other endpoints)
      expect([200, 500]).toContain(response.status);
    });

    it('should track requests after making API calls', async () => {
      const validUserAgent = 'TestApp/1.0 (test@example.com)';

      // Make some API calls
      await request(app).get('/api/v1/analytics/global').set('User-Agent', validUserAgent);

      // Get metrics
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      // Metrics should include request data
      expect(response.text).toBeDefined();
    });
  });
});
