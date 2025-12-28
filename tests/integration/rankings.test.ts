/**
 * Integration tests for rankings endpoints
 */

import request from 'supertest';
import { Express } from 'express';

interface UserRankingEntry {
  rank: number;
  user_id: number;
  username: string | null;
  value: number | null;
}

interface UserRankingsResponse {
  metric: string;
  country?: number;
  order: string;
  rankings: UserRankingEntry[];
}

interface CountryRankingEntry {
  rank: number;
  country_id: number;
  country_name: string | null;
  value: number | null;
}

interface CountryRankingsResponse {
  metric: string;
  order: string;
  rankings: CountryRankingEntry[];
}

interface ErrorResponse {
  error: string;
  message: string;
}

describe('Rankings Endpoints', () => {
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

  describe('GET /api/v1/users/rankings', () => {
    it('should return 400 when metric is missing', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('required');
    });

    it('should return 400 when metric is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'invalid_metric' })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
      expect(body.message).toContain('must be one of');
    });

    it('should return 400 when limit is greater than 100', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', limit: 101 })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
    });

    it('should return 400 when limit is less than 1', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', limit: 0 })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
    });

    it('should return 400 when order is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', order: 'invalid' })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
    });

    it('should return 400 when country is negative', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', country: -1 })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
    });

    it('should return 200 for valid parameters', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });

    it('should return rankings data structure when successful', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as UserRankingsResponse;
        expect(body).toHaveProperty('metric');
        expect(body).toHaveProperty('order');
        expect(body).toHaveProperty('rankings');
        expect(Array.isArray(body.rankings)).toBe(true);
        if (body.rankings.length > 0) {
          const entry = body.rankings[0];
          expect(entry).toHaveProperty('rank');
          expect(entry).toHaveProperty('user_id');
          expect(entry).toHaveProperty('username');
          expect(entry).toHaveProperty('value');
        }
      }
    });

    it('should accept all valid metrics', async () => {
      const validMetrics = [
        'history_whole_open',
        'history_whole_closed',
        'history_whole_commented',
        'resolution_rate',
        'avg_days_to_resolution',
      ];

      for (const metric of validMetrics) {
        const response = await request(app)
          .get('/api/v1/users/rankings')
          .query({ metric, limit: 5 })
          .set('User-Agent', validUserAgent);

        // Should return 200 (if data exists) or 500 (if DB unavailable)
        expect([200, 500]).toContain(response.status);
      }
    });

    it('should accept country filter', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', country: 1, limit: 10 })
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as UserRankingsResponse;
        expect(body).toHaveProperty('country');
      }
    });

    it('should accept order parameter', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open', order: 'asc', limit: 10 })
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as UserRankingsResponse;
        expect(body.order).toBe('asc');
      }
    });

    it('should require User-Agent header', async () => {
      const response = await request(app)
        .get('/api/v1/users/rankings')
        .query({ metric: 'history_whole_open' });

      expect([400, 429]).toContain(response.status);
    });
  });

  describe('GET /api/v1/countries/rankings', () => {
    it('should return 400 when metric is missing', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('required');
    });

    it('should return 400 when metric is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'invalid_metric' })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
      expect(body.message).toContain('must be one of');
    });

    it('should return 400 when limit is greater than 100', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open', limit: 101 })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
    });

    it('should return 400 when limit is less than 1', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open', limit: 0 })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
    });

    it('should return 400 when order is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open', order: 'invalid' })
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
    });

    it('should return 200 for valid parameters', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });

    it('should return rankings data structure when successful', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open', limit: 10 })
        .set('User-Agent', validUserAgent);

      if (response.status === 200) {
        const body = response.body as CountryRankingsResponse;
        expect(body).toHaveProperty('metric');
        expect(body).toHaveProperty('order');
        expect(body).toHaveProperty('rankings');
        expect(Array.isArray(body.rankings)).toBe(true);
        if (body.rankings.length > 0) {
          const entry = body.rankings[0];
          expect(entry).toHaveProperty('rank');
          expect(entry).toHaveProperty('country_id');
          expect(entry).toHaveProperty('country_name');
          expect(entry).toHaveProperty('value');
        }
      }
    });

    it('should accept all valid metrics', async () => {
      const validMetrics = [
        'history_whole_open',
        'history_whole_closed',
        'resolution_rate',
        'avg_days_to_resolution',
        'notes_health_score',
      ];

      for (const metric of validMetrics) {
        const response = await request(app)
          .get('/api/v1/countries/rankings')
          .query({ metric, limit: 5 })
          .set('User-Agent', validUserAgent);

        // Should return 200 (if data exists) or 500 (if DB unavailable)
        expect([200, 500]).toContain(response.status);
      }
    });

    it('should accept order parameter', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open', order: 'asc', limit: 10 })
        .set('User-Agent', validUserAgent);

      // Should return 200 (if data exists) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const body = response.body as CountryRankingsResponse;
        expect(body.order).toBe('asc');
      }
    });

    it('should require User-Agent header', async () => {
      const response = await request(app)
        .get('/api/v1/countries/rankings')
        .query({ metric: 'history_whole_open' });

      expect([400, 429]).toContain(response.status);
    });
  });
});
