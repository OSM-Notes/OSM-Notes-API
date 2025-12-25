/**
 * Integration tests for User-Agent validation middleware
 */

import request from 'supertest';
import { Express } from 'express';

describe('User-Agent Validation Middleware Integration', () => {
  let app: Express;

  beforeAll(async () => {
    // Set required environment variables before importing app
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'test_db';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';

    const { default: createApp } = await import('../../../src/index');
    app = createApp();
  });

  describe('GET /health with User-Agent validation', () => {
    it('should reject request without User-Agent header', async () => {
      const response = await request(app).get('/health');
      const body = response.body as { error: string; message: string };

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('User-Agent');
    });

    it('should reject request with invalid User-Agent format', async () => {
      const response = await request(app).get('/health').set('User-Agent', 'InvalidFormat');
      const body = response.body as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('Invalid User-Agent format');
    });

    it('should reject User-Agent without contact', async () => {
      const response = await request(app).get('/health').set('User-Agent', 'MyApp/1.0');
      const body = response.body as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('Invalid User-Agent format');
    });

    it('should reject User-Agent with invalid contact', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'MyApp/1.0 (not-an-email-or-url)');
      const body = response.body as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('Invalid User-Agent format');
    });

    it('should accept request with valid User-Agent (email)', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'MyApp/1.0 (contact@example.com)');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    it('should accept request with valid User-Agent (URL)', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'MyApp/1.0 (https://example.com/contact)');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    it('should accept request with valid User-Agent (HTTP URL)', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'MyApp/1.0 (http://example.com)');

      expect(response.status).toBe(200);
    });

    it('should handle User-Agent with spaces in app name', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'My App/1.0 (contact@example.com)');

      expect(response.status).toBe(200);
    });

    it('should handle User-Agent with version containing dots', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'MyApp/1.2.3 (contact@example.com)');

      expect(response.status).toBe(200);
    });
  });
});
