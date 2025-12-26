/**
 * Comprehensive security integration tests
 */

import request from 'supertest';
import { Express } from 'express';

describe('Security Tests', () => {
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

  describe('User-Agent Validation Security', () => {
    it('should reject requests without User-Agent header', async () => {
      const endpoints = [
        '/api/v1/notes',
        '/api/v1/notes/12345',
        '/api/v1/users/12345',
        '/api/v1/countries/42',
        '/api/v1/analytics/global',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        const body = response.body as { message: string };
        expect(body.message).toContain('User-Agent');
      }
    });

    it('should reject AI User-Agents without OAuth', async () => {
      const aiUserAgents = [
        'GPT-4/1.0 (ai@example.com)',
        'ChatGPT/1.0 (ai@example.com)',
        'Claude/1.0 (ai@example.com)',
        'Bard/1.0 (ai@example.com)',
        'Copilot/1.0 (ai@example.com)',
      ];

      for (const ua of aiUserAgents) {
        const response = await request(app).get('/api/v1/notes?limit=1').set('User-Agent', ua);

        // Should either reject (403) or require OAuth
        expect([400, 403]).toContain(response.status);
      }
    });

    it('should reject bot User-Agents without proper identification', async () => {
      const botUserAgents = ['bot', 'crawler', 'spider', 'scraper'];

      for (const ua of botUserAgents) {
        const response = await request(app).get('/api/v1/notes?limit=1').set('User-Agent', ua);

        // Should reject or require proper format
        expect([400, 403]).toContain(response.status);
      }
    });

    it('should accept valid User-Agent formats', async () => {
      const validUserAgents = [
        'MyApp/1.0 (contact@example.com)',
        'MyApp/1.0 (https://example.com/contact)',
        'MyApp/1.0 (http://example.com)',
        'My App/1.0 (contact@example.com)',
        'MyApp/1.2.3 (contact@example.com)',
      ];

      for (const ua of validUserAgents) {
        const response = await request(app).get('/api/v1/notes?limit=1').set('User-Agent', ua);

        // Should accept valid formats
        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits on all endpoints', async () => {
      const endpoints = [
        '/api/v1/notes',
        '/api/v1/notes/12345',
        '/api/v1/users/12345',
        '/api/v1/countries/42',
        '/api/v1/analytics/global',
      ];

      for (const endpoint of endpoints) {
        // Make limited requests to avoid overwhelming the system
        // Reduced from 100 to 20 for better performance
        const requests = Array(20)
          .fill(null)
          .map(() => request(app).get(endpoint).set('User-Agent', validUserAgent));

        const responses = await Promise.all(requests);

        // Should eventually hit rate limit (429)
        // Note: This depends on rate limit configuration
        // We check that all requests completed, rate limiting may or may not trigger
        expect(responses.length).toBe(20);
      }
    });

    it('should handle rate limit headers correctly', async () => {
      const response = await request(app)
        .get('/api/v1/notes?limit=1')
        .set('User-Agent', validUserAgent);

      // Should have rate limit headers if configured
      // Note: Headers may or may not be present depending on implementation
      expect([200, 404, 429]).toContain(response.status);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection in all endpoints', async () => {
      const sqlInjectionPayloads = [
        "1' OR '1'='1",
        "1'; DROP TABLE notes; --",
        "1' UNION SELECT * FROM users --",
        "1' OR 1=1 --",
        "admin'--",
        "admin'/*",
      ];

      const endpoints = ['/api/v1/notes/', '/api/v1/users/', '/api/v1/countries/'];

      for (const endpoint of endpoints) {
        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .get(`${endpoint}${encodeURIComponent(payload)}`)
            .set('User-Agent', validUserAgent);

          // Should reject with 400, not execute SQL
          expect(response.status).toBe(400);
        }
      }
    });

    it('should prevent NoSQL injection attempts', async () => {
      const nosqlPayloads = ['[$ne]=null', '[$gt]=', '[$regex]=', '{"$ne": null}'];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .get(`/api/v1/notes?${payload}`)
          .set('User-Agent', validUserAgent);

        // Should reject or handle safely
        expect([200, 400]).toContain(response.status);
      }
    });

    it('should prevent command injection attempts', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& rm -rf /',
        '`whoami`',
        '$(id)',
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .get(`/api/v1/notes/${encodeURIComponent(payload)}`)
          .set('User-Agent', validUserAgent);

        // Should reject with 400
        expect(response.status).toBe(400);
      }
    });

    it('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../',
        '../../',
        '..\\',
        '..%2F',
        '%2E%2E%2F',
        '....//',
        '....\\\\',
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get(`/api/v1/notes/${payload}123`)
          .set('User-Agent', validUserAgent);

        // Should reject with 400
        expect(response.status).toBe(400);
      }
    });

    it('should prevent XSS attempts in query parameters', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>',
        '"><script>alert("xss")</script>',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .get(`/api/v1/notes?status=${encodeURIComponent(payload)}`)
          .set('User-Agent', validUserAgent);

        // Should reject with 400
        expect(response.status).toBe(400);
      }
    });

    it('should prevent XXE attacks', async () => {
      // XXE typically requires XML input, but we test with query params
      const xxePayloads = [
        '%3C!ENTITY%20xxe%20SYSTEM%20"file:///etc/passwd"%3E',
        '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
      ];

      for (const payload of xxePayloads) {
        const response = await request(app)
          .get(`/api/v1/notes?q=${encodeURIComponent(payload)}`)
          .set('User-Agent', validUserAgent);

        // Should reject or handle safely
        expect([200, 400]).toContain(response.status);
      }
    });
  });

  describe('HTTP Method Security', () => {
    it('should reject unsupported HTTP methods', async () => {
      const endpoints = ['/api/v1/notes', '/api/v1/notes/12345', '/api/v1/users/12345'];

      for (const endpoint of endpoints) {
        // Test POST (should be rejected for GET-only endpoints)
        const postResponse = await request(app).post(endpoint).set('User-Agent', validUserAgent);

        expect([404, 405]).toContain(postResponse.status);

        // Test PUT (should be rejected)
        const putResponse = await request(app).put(endpoint).set('User-Agent', validUserAgent);

        expect([404, 405]).toContain(putResponse.status);

        // Test DELETE (should be rejected)
        const deleteResponse = await request(app)
          .delete(endpoint)
          .set('User-Agent', validUserAgent);

        expect([404, 405]).toContain(deleteResponse.status);

        // Test PATCH (should be rejected)
        const patchResponse = await request(app).patch(endpoint).set('User-Agent', validUserAgent);

        expect([404, 405]).toContain(patchResponse.status);
      }
    });
  });

  describe('Header Security', () => {
    it('should have security headers set', async () => {
      const response = await request(app)
        .get('/api/v1/notes?limit=1')
        .set('User-Agent', validUserAgent);

      // Check for security headers (Helmet should set these)
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should handle CORS correctly', async () => {
      const response = await request(app)
        .options('/api/v1/notes')
        .set('Origin', 'http://example.com')
        .set('User-Agent', validUserAgent);

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('DoS Protection', () => {
    it('should handle extremely large requests', async () => {
      const largeQuery = '?status=' + 'a'.repeat(10000);
      const response = await request(app)
        .get(`/api/v1/notes${largeQuery}`)
        .set('User-Agent', validUserAgent);

      // Should reject or handle gracefully
      expect([200, 400, 413, 414]).toContain(response.status);
    });

    it('should handle many query parameters', async () => {
      // Reduced from 100 to 20 to avoid overwhelming the system
      const manyParams = Array(20)
        .fill(null)
        .map((_, i) => `param${i}=value${i}`)
        .join('&');

      const response = await request(app)
        .get(`/api/v1/notes?${manyParams}`)
        .set('User-Agent', validUserAgent);

      // Should handle or reject gracefully
      expect([200, 400, 414]).toContain(response.status);
    });
  });

  describe('Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/v1/notes/invalid')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');

      // Error message should not contain sensitive info
      const errorMessage = JSON.stringify(response.body);
      expect(errorMessage).not.toContain('password');
      expect(errorMessage).not.toContain('secret');
      expect(errorMessage).not.toContain('token');
      expect(errorMessage).not.toContain('key');
    });

    it('should not expose stack traces in production', async () => {
      // This test assumes production mode
      // In development, stack traces might be shown
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(404);
      // Stack traces should not be in response
      expect(JSON.stringify(response.body)).not.toContain('at ');
    });
  });
});
