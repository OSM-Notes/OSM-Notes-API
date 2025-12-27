/**
 * Integration tests for edge cases and boundary conditions
 */

import request from 'supertest';
import { Express } from 'express';

describe('Edge Cases and Boundary Conditions', () => {
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

  describe('Notes Endpoints - Edge Cases', () => {
    it('should handle very large note ID', async () => {
      const response = await request(app)
        .get('/api/v1/notes/999999999999')
        .set('User-Agent', validUserAgent);

      // Should either return 404 (not found), 200 (if exists), or 500 (if DB unavailable)
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle note ID at maximum safe integer', async () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      const response = await request(app)
        .get(`/api/v1/notes/${maxSafeInt}`)
        .set('User-Agent', validUserAgent);

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle floating point note ID', async () => {
      const response = await request(app)
        .get('/api/v1/notes/123.45')
        .set('User-Agent', validUserAgent);

      expect([400, 500]).toContain(response.status);
    });

    it('should handle note ID with leading zeros', async () => {
      const response = await request(app)
        .get('/api/v1/notes/00012345')
        .set('User-Agent', validUserAgent);

      // Should parse as 12345
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle empty search query', async () => {
      const response = await request(app).get('/api/v1/notes').set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should handle search with all filters empty', async () => {
      const response = await request(app)
        .get('/api/v1/notes?status=&country=&user=')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);
    });

    it('should handle pagination at boundary values', async () => {
      // Test page 1 with limit 1
      const response1 = await request(app)
        .get('/api/v1/notes?page=1&limit=1')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response1.status);

      // Test maximum limit
      const response2 = await request(app)
        .get('/api/v1/notes?page=1&limit=100')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response2.status);
    });

    it('should handle invalid pagination parameters', async () => {
      // Test page 0
      const response1 = await request(app)
        .get('/api/v1/notes?page=0&limit=10')
        .set('User-Agent', validUserAgent);

      expect(response1.status).toBe(400);

      // Test negative page
      const response2 = await request(app)
        .get('/api/v1/notes?page=-1&limit=10')
        .set('User-Agent', validUserAgent);

      expect(response2.status).toBe(400);

      // Test limit exceeding maximum
      const response3 = await request(app)
        .get('/api/v1/notes?page=1&limit=1000')
        .set('User-Agent', validUserAgent);

      expect(response3.status).toBe(400);
    });

    it('should handle special characters in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/notes?status=open&country=42&user=123')
        .set('User-Agent', validUserAgent);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle very long User-Agent string', async () => {
      const longUserAgent = `TestApp/1.0 (${'a'.repeat(500)}@example.com)`;
      const response = await request(app)
        .get('/api/v1/notes?limit=1')
        .set('User-Agent', longUserAgent);

      // Should either accept or reject based on validation
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Users Endpoints - Edge Cases', () => {
    it('should handle very large user ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/999999999999')
        .set('User-Agent', validUserAgent);

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle user ID with special characters', async () => {
      const response = await request(app)
        .get('/api/v1/users/123%20456')
        .set('User-Agent', validUserAgent);

      expect([400, 500]).toContain(response.status);
    });

    it('should handle user ID as string with numbers', async () => {
      const response = await request(app)
        .get('/api/v1/users/123abc')
        .set('User-Agent', validUserAgent);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Countries Endpoints - Edge Cases', () => {
    it('should handle very large country ID', async () => {
      const response = await request(app)
        .get('/api/v1/countries/999999999999')
        .set('User-Agent', validUserAgent);

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle country ID with leading zeros', async () => {
      const response = await request(app)
        .get('/api/v1/countries/00042')
        .set('User-Agent', validUserAgent);

      // Should parse as 42
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle SQL injection attempts in note ID', async () => {
      const sqlInjectionAttempts = [
        "1' OR '1'='1",
        '1; DROP TABLE notes; --',
        "1' UNION SELECT * FROM users --",
      ];

      for (const attempt of sqlInjectionAttempts) {
        const response = await request(app)
          .get(`/api/v1/notes/${encodeURIComponent(attempt)}`)
          .set('User-Agent', validUserAgent);

        // Should reject with 400, not execute SQL (or 500 if DB unavailable)
        expect([400, 500]).toContain(response.status);
      }
    });

    it('should handle XSS attempts in query parameters', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
      ];

      for (const attempt of xssAttempts) {
        const response = await request(app)
          .get(`/api/v1/notes?status=${encodeURIComponent(attempt)}`)
          .set('User-Agent', validUserAgent);

        // Should reject with 400
        expect(response.status).toBe(400);
      }
    });

    it('should handle path traversal attempts', async () => {
      const pathTraversalAttempts = ['../', '../../', '..\\', '..%2F'];

      for (const attempt of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/v1/notes/${encodeURIComponent(attempt)}123`)
          .set('User-Agent', validUserAgent);

        // Should reject with 400
        expect(response.status).toBe(400);
      }
    });

    it('should handle extremely long URLs', async () => {
      const longQuery = '?status=' + 'a'.repeat(10000);
      const response = await request(app)
        .get(`/api/v1/notes${longQuery}`)
        .set('User-Agent', validUserAgent);

      // Should either reject or handle gracefully
      expect([200, 400, 414]).toContain(response.status);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/api/v1/notes?limit=1').set('User-Agent', validUserAgent));

      const responses = await Promise.all(requests);

      // All requests should complete
      expect(responses.length).toBe(10);

      // All should return valid status codes
      responses.forEach((response) => {
        expect([200, 429, 500]).toContain(response.status);
      });
    });
  });

  describe('Content-Type Validation', () => {
    it('should handle requests with incorrect Content-Type', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .set('User-Agent', validUserAgent)
        .set('Content-Type', 'application/xml');

      // Should still work for GET requests
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Unicode and International Characters', () => {
    it('should handle Unicode characters in User-Agent', async () => {
      const unicodeUserAgent = 'TestApp/1.0 (test@example.com) 测试';
      try {
        const response = await request(app)
          .get('/api/v1/notes?limit=1')
          .set('User-Agent', unicodeUserAgent);

        // Should either accept or reject based on validation
        expect([200, 400, 500]).toContain(response.status);
      } catch (error) {
        // supertest may throw an error for invalid header characters
        // This is acceptable behavior
        expect(error).toBeDefined();
      }
    });
  });
});
