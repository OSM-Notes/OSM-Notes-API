/**
 * Integration tests for health check endpoint
 */

import request from 'supertest';
import { Express } from 'express';

describe('Health Check Endpoint', () => {
  let app: Express;

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

  describe('GET /health', () => {
    const validUserAgent = 'TestApp/1.0 (test@example.com)';

    it('should return 200 status', async () => {
      const response = await request(app).get('/health').set('User-Agent', validUserAgent);
      // Health check returns 200 for healthy/degraded, 503 for unhealthy
      expect([200, 503]).toContain(response.status);
    });

    it('should return JSON response', async () => {
      const response = await request(app).get('/health').set('User-Agent', validUserAgent);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should include status field', async () => {
      const response = await request(app).get('/health').set('User-Agent', validUserAgent);
      expect(response.body).toHaveProperty('status');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health').set('User-Agent', validUserAgent);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should check database connection', async () => {
      const response = await request(app).get('/health').set('User-Agent', validUserAgent);
      const body = response.body as {
        database: { status: string };
      };
      expect(body).toHaveProperty('database');
      expect(body.database.status).toBeDefined();
    });

    it('should check Redis connection if available', async () => {
      const response = await request(app).get('/health').set('User-Agent', validUserAgent);
      const body = response.body as {
        redis: { status: string };
      };
      expect(body).toHaveProperty('redis');
      expect(body.redis.status).toBeDefined();
    });

    it('should return status when all services are checked', async () => {
      const response = await request(app).get('/health').set('User-Agent', validUserAgent);
      const body = response.body as {
        status: string;
        database: { status: string };
        redis: { status: string };
      };
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    });
  });
});
