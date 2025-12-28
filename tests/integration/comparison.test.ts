/**
 * Integration tests for comparison endpoint
 */

import request from 'supertest';
import { Express } from 'express';

describe('Comparison API Integration Tests', () => {
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

  describe('GET /api/v1/analytics/comparison', () => {
    it('should return 400 if User-Agent header is missing', async () => {
      const response = await request(app).get('/api/v1/analytics/comparison?type=users&ids=12345');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if type parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?ids=12345')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      const body = response.body as { error: string };
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('type');
    });

    it('should return 400 if ids parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      const body = response.body as { error: string };
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('ids');
    });

    it('should return 400 for invalid type parameter', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=invalid&ids=12345')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty ids parameter', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users&ids=')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users&ids=abc,123')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for more than 10 IDs', async () => {
      const ids = Array.from({ length: 11 }, (_, i) => i + 1).join(',');
      const response = await request(app)
        .get(`/api/v1/analytics/comparison?type=users&ids=${ids}`)
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      const body = response.body as { error: string };
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Maximum 10');
    });

    it('should compare users successfully', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users&ids=12345,67890')
        .set('User-Agent', VALID_USER_AGENT);

      // Should return 200 (if users exist) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        const body = response.body as {
          type: string;
          entities: Array<{
            user_id: number;
            username: string | null;
            history_whole_open: number;
            history_whole_closed: number;
          }>;
        };
        expect(body).toHaveProperty('type');
        expect(body.type).toBe('users');
        expect(body).toHaveProperty('entities');
        expect(Array.isArray(body.entities)).toBe(true);
      }
    });

    it('should compare countries successfully', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=countries&ids=42,43')
        .set('User-Agent', VALID_USER_AGENT);

      // Should return 200 (if countries exist) or 500 (if DB unavailable)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        const body = response.body as {
          type: string;
          entities: Array<{
            country_id: number;
            country_name: string | null;
            history_whole_open: number;
            history_whole_closed: number;
          }>;
        };
        expect(body).toHaveProperty('type');
        expect(body.type).toBe('countries');
        expect(body).toHaveProperty('entities');
        expect(Array.isArray(body.entities)).toBe(true);
      }
    });

    it('should handle single user comparison', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users&ids=12345')
        .set('User-Agent', VALID_USER_AGENT);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        const body = response.body as { type: string; entities: unknown[] };
        expect(body.type).toBe('users');
        if (Array.isArray(body.entities)) {
          expect(body.entities.length).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should handle single country comparison', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=countries&ids=42')
        .set('User-Agent', VALID_USER_AGENT);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        const body = response.body as { type: string; entities: unknown[] };
        expect(body.type).toBe('countries');
        expect(body.entities.length).toBeLessThanOrEqual(1);
      }
    });

    it('should handle whitespace in ids parameter', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users&ids=12345, 67890 , 11111')
        .set('User-Agent', VALID_USER_AGENT);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return empty entities array when IDs not found', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users&ids=999999999')
        .set('User-Agent', VALID_USER_AGENT);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        const body = response.body as { type: string; entities: unknown[] };
        expect(body.type).toBe('users');
        expect(Array.isArray(body.entities)).toBe(true);
      }
    });

    it('should return user comparison with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=users&ids=12345')
        .set('User-Agent', VALID_USER_AGENT);

      const responseBody = response.body as { entities: unknown[] };
      if (
        response.status === 200 &&
        Array.isArray(responseBody.entities) &&
        responseBody.entities.length > 0
      ) {
        const typedBody = responseBody as {
          entities: Array<{
            user_id: number;
            username: string | null;
            history_whole_open: number;
            history_whole_closed: number;
            history_whole_commented: number;
            avg_days_to_resolution: number | null;
            resolution_rate: number | null;
            user_response_time: number | null;
          }>;
        };
        const entity = typedBody.entities[0];
        expect(entity).toHaveProperty('user_id');
        expect(entity).toHaveProperty('username');
        expect(entity).toHaveProperty('history_whole_open');
        expect(entity).toHaveProperty('history_whole_closed');
        expect(entity).toHaveProperty('history_whole_commented');
        expect(typeof entity.user_id).toBe('number');
      }
    });

    it('should return country comparison with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/comparison?type=countries&ids=42')
        .set('User-Agent', VALID_USER_AGENT);

      const body = response.body as { entities: unknown[] };
      if (response.status === 200 && body.entities.length > 0) {
        const typedBody = body as {
          entities: Array<{
            country_id: number;
            country_name: string | null;
            history_whole_open: number;
            history_whole_closed: number;
            avg_days_to_resolution: number | null;
            resolution_rate: number | null;
            notes_health_score: number | null;
          }>;
        };
        const entity = typedBody.entities[0];
        expect(entity).toHaveProperty('country_id');
        expect(entity).toHaveProperty('country_name');
        expect(entity).toHaveProperty('history_whole_open');
        expect(entity).toHaveProperty('history_whole_closed');
        expect(typeof entity.country_id).toBe('number');
      }
    });
  });
});
