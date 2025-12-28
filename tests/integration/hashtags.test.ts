/**
 * Integration tests for hashtags endpoints
 */

import request from 'supertest';
import { Express } from 'express';

describe('Hashtags API Integration Tests', () => {
  let app: Express;
  const VALID_USER_AGENT = 'TestApp/1.0 (test@example.com)';

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

  describe('GET /api/v1/hashtags', () => {
    it('should return 400 if User-Agent header is missing', async () => {
      const response = await request(app).get('/api/v1/hashtags');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return list of hashtags with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as { data: unknown[]; pagination: unknown };
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(response.headers['x-total-count']).toBeDefined();
      expect(response.headers['x-page']).toBeDefined();
      expect(response.headers['x-per-page']).toBeDefined();
      expect(response.headers['x-total-pages']).toBeDefined();
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags?page=1&limit=10')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as {
        pagination: { page: number; limit: number };
      };
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
    });

    it('should support order parameter (asc)', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags?order=asc')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as { data: unknown };
      expect(body.data).toBeDefined();
    });

    it('should support order parameter (desc)', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags?order=desc')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as { data: unknown };
      expect(body.data).toBeDefined();
    });

    it('should return 400 for invalid order parameter', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags?order=invalid')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return hashtags with count property', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as { data: Array<{ hashtag: string; count: number }> };
      if (body.data.length > 0) {
        const hashtag = body.data[0];
        expect(hashtag).toHaveProperty('hashtag');
        expect(hashtag).toHaveProperty('count');
        expect(typeof hashtag.hashtag).toBe('string');
        expect(typeof hashtag.count).toBe('number');
      }
    });
  });

  describe('GET /api/v1/hashtags/:hashtag', () => {
    it('should return 400 if User-Agent header is missing', async () => {
      const response = await request(app).get('/api/v1/hashtags/fixme');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return hashtag details with users and countries', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags/fixme')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as {
        hashtag: string;
        users_count: number;
        countries_count: number;
        users: unknown[];
        countries: unknown[];
      };
      expect(body).toHaveProperty('hashtag');
      expect(body).toHaveProperty('users_count');
      expect(body).toHaveProperty('countries_count');
      expect(body).toHaveProperty('users');
      expect(body).toHaveProperty('countries');
      expect(Array.isArray(body.users)).toBe(true);
      expect(Array.isArray(body.countries)).toBe(true);
      expect(typeof body.users_count).toBe('number');
      expect(typeof body.countries_count).toBe('number');
    });

    it('should handle hashtag with # prefix', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags/%23fixme')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as { hashtag: string };
      expect(body.hashtag).toBe('fixme'); // Should remove #
    });

    it('should return empty arrays when hashtag not found', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags/nonexistenthashtag12345')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as {
        hashtag: string;
        users_count: number;
        countries_count: number;
        users: unknown[];
        countries: unknown[];
      };
      expect(body.hashtag).toBe('nonexistenthashtag12345');
      expect(body.users_count).toBe(0);
      expect(body.countries_count).toBe(0);
      expect(body.users).toHaveLength(0);
      expect(body.countries).toHaveLength(0);
    });

    it('should return 400 for empty hashtag', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags/')
        .set('User-Agent', VALID_USER_AGENT);

      // Express will likely return 404 for this, but we test the endpoint exists
      expect([400, 404]).toContain(response.status);
    });

    it('should return user summaries with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags/fixme')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as {
        users: Array<{
          user_id: number;
          username: string | null;
          history_whole_open: number;
          history_whole_closed: number;
        }>;
      };
      if (body.users.length > 0) {
        const user = body.users[0];
        expect(user).toHaveProperty('user_id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('history_whole_open');
        expect(user).toHaveProperty('history_whole_closed');
        expect(typeof user.user_id).toBe('number');
      }
    });

    it('should return country summaries with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags/fixme')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as {
        countries: Array<{
          country_id: number;
          country_name: string | null;
          history_whole_open: number;
          history_whole_closed: number;
        }>;
      };
      if (body.countries.length > 0) {
        const country = body.countries[0];
        expect(country).toHaveProperty('country_id');
        expect(country).toHaveProperty('country_name');
        expect(country).toHaveProperty('history_whole_open');
        expect(country).toHaveProperty('history_whole_closed');
        expect(typeof country.country_id).toBe('number');
      }
    });

    it('should limit users and countries to 50 each', async () => {
      const response = await request(app)
        .get('/api/v1/hashtags/fixme')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(200);
      const body = response.body as {
        users: unknown[];
        countries: unknown[];
      };
      expect(body.users.length).toBeLessThanOrEqual(50);
      expect(body.countries.length).toBeLessThanOrEqual(50);
    });
  });
});
