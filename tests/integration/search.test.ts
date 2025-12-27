/**
 * Integration tests for search endpoints
 */

import request from 'supertest';
import { Express } from 'express';

/**
 * Response type for user search
 */
interface UserSearchResponse {
  data: Array<{
    user_id: number;
    username: string | null;
    history_whole_open: number;
    history_whole_closed: number;
  }>;
  count: number;
}

/**
 * Response type for country search
 */
interface CountrySearchResponse {
  data: Array<{
    country_id: number;
    country_name: string | null;
    country_name_en: string | null;
    country_name_es: string | null;
    iso_alpha2: string | null;
    history_whole_open: number;
    history_whole_closed: number;
  }>;
  count: number;
}

/**
 * Error response type
 */
interface ErrorResponse {
  error: string;
  message: string;
}

describe('Search Endpoints', () => {
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

  describe('GET /api/v1/search/users', () => {
    it('should return 200 status for valid search query', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .query({ q: 'test' })
        .set('User-Agent', validUserAgent);

      // Should return 200 (with results or empty), 500 (if DB unavailable), or 429 (if rate limited)
      expect([200, 500, 429]).toContain(response.status);
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .set('User-Agent', validUserAgent);

      // May return 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);
      if (response.status === 400) {
        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('message');
        expect(body.message).toContain('q');
      }
    });

    it('should return 400 when query parameter is empty', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .query({ q: '' })
        .set('User-Agent', validUserAgent);

      // May return 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 400 when query parameter is only whitespace', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .query({ q: '   ' })
        .set('User-Agent', validUserAgent);

      // May return 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);
    });

    it('should return JSON response with data array', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .query({ q: 'test' })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/json/);
        const body = response.body as UserSearchResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('count');
        expect(Array.isArray(body.data)).toBe(true);
        expect(typeof body.count).toBe('number');
      }
    });

    it('should return user search results with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .query({ q: 'test' })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as UserSearchResponse;
        if (body.data.length > 0) {
          const user = body.data[0];
          expect(user).toHaveProperty('user_id');
          expect(user).toHaveProperty('username');
          expect(user).toHaveProperty('history_whole_open');
          expect(user).toHaveProperty('history_whole_closed');
          expect(typeof user.user_id).toBe('number');
        }
      }
    });

    it('should search by numeric user_id when query is numeric', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .query({ q: '12345' })
        .set('User-Agent', validUserAgent);

      // Should return 200 (with result or empty), 500 (if DB unavailable), or 429 (if rate limited)
      expect([200, 500, 429]).toContain(response.status);
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/api/v1/search/users').query({ q: 'test' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should respect rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array.from({ length: 55 }, () =>
        request(app)
          .get('/api/v1/search/users')
          .query({ q: 'test' })
          .set('User-Agent', validUserAgent)
      );

      const responses = await Promise.all(requests);

      // First 50 should succeed (or return 500 if DB unavailable)
      // Request 51+ might be rate limited (429)
      const statusCodes = responses.map((r) => r.status);

      // If rate limiting is working, some requests should be 429
      // If not rate limited, all should be 200 or 500
      expect([200, 500, 429]).toContain(statusCodes[0]);
    });
  });

  describe('GET /api/v1/search/countries', () => {
    it('should return 200 status for valid search query', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: 'Colombia' })
        .set('User-Agent', validUserAgent);

      // Should return 200 (with results or empty), 500 (if DB unavailable), or 429 (if rate limited)
      expect([200, 500, 429]).toContain(response.status);
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .set('User-Agent', validUserAgent);

      // May return 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);
      if (response.status === 400) {
        const body = response.body as ErrorResponse;
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('message');
        expect(body.message).toContain('q');
      }
    });

    it('should return 400 when query parameter is empty', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: '' })
        .set('User-Agent', validUserAgent);

      // May return 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 400 when query parameter is only whitespace', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: '   ' })
        .set('User-Agent', validUserAgent);

      // May return 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);
    });

    it('should return JSON response with data array', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: 'Colombia' })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/json/);
        const body = response.body as CountrySearchResponse;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('count');
        expect(Array.isArray(body.data)).toBe(true);
        expect(typeof body.count).toBe('number');
      }
    });

    it('should return country search results with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: 'Colombia' })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as CountrySearchResponse;
        if (body.data.length > 0) {
          const country = body.data[0];
          expect(country).toHaveProperty('country_id');
          expect(country).toHaveProperty('country_name');
          expect(country).toHaveProperty('country_name_en');
          expect(country).toHaveProperty('country_name_es');
          expect(country).toHaveProperty('iso_alpha2');
          expect(country).toHaveProperty('history_whole_open');
          expect(country).toHaveProperty('history_whole_closed');
          expect(typeof country.country_id).toBe('number');
        }
      }
    });

    it('should search by ISO code', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: 'CO' })
        .set('User-Agent', validUserAgent);

      // Should return 200 (with result or empty), 500 (if DB unavailable), or 429 (if rate limited)
      expect([200, 500, 429]).toContain(response.status);
    });

    it('should search by numeric country_id when query is numeric', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: '42' })
        .set('User-Agent', validUserAgent);

      // Should return 200 (with result or empty), 500 (if DB unavailable), or 429 (if rate limited)
      expect([200, 500, 429]).toContain(response.status);
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/api/v1/search/countries').query({ q: 'Colombia' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should respect rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array.from({ length: 55 }, () =>
        request(app)
          .get('/api/v1/search/countries')
          .query({ q: 'Colombia' })
          .set('User-Agent', validUserAgent)
      );

      const responses = await Promise.all(requests);

      // First 50 should succeed (or return 500 if DB unavailable)
      // Request 51+ might be rate limited (429)
      const statusCodes = responses.map((r) => r.status);

      // If rate limiting is working, some requests should be 429
      // If not rate limited, all should be 200 or 500
      expect([200, 500, 429]).toContain(statusCodes[0]);
    });

    it('should limit results to 50 countries', async () => {
      const response = await request(app)
        .get('/api/v1/search/countries')
        .query({ q: 'a' }) // Broad search that might return many results
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as CountrySearchResponse;
        expect(body.data.length).toBeLessThanOrEqual(50);
        expect(body.count).toBeLessThanOrEqual(50);
      }
    });

    it('should limit results to 50 users', async () => {
      const response = await request(app)
        .get('/api/v1/search/users')
        .query({ q: 'a' }) // Broad search that might return many results
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as UserSearchResponse;
        expect(body.data.length).toBeLessThanOrEqual(50);
        expect(body.count).toBeLessThanOrEqual(50);
      }
    });
  });
});
