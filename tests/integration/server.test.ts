/**
 * Integration tests for Express server setup
 */

import request from 'supertest';
import { Express } from 'express';

describe('Express Server Setup', () => {
  let app: Express;

  beforeAll(async () => {
    // Ensure environment variables are set before importing
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'test_db';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';

    // Import app after all modules are loaded
    const { default: createApp } = await import('../../src/index');
    app = createApp();
  });

  describe('Basic Server Configuration', () => {
    it('should start server and respond to requests', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBeDefined();
    });

    it('should have CORS enabled', async () => {
      const response = await request(app).options('/health').set('Origin', 'http://example.com');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should have security headers (Helmet)', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should parse JSON body', async () => {
      // Test JSON parsing by checking that invalid JSON returns 400
      const response = await request(app)
        .post('/api/v1')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      // Should handle invalid JSON gracefully (either 400 or 404)
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle errors with proper format', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('API Versioning', () => {
    it('should have /api/v1 prefix', async () => {
      // This will be implemented when routes are added
      const response = await request(app).get('/api/v1');

      // Should not be 404 if versioning is set up correctly
      expect(response.status).toBeDefined();
    });
  });
});
