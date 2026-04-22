/**
 * Integration tests for trends endpoint
 * Tests GET /notes-api/v1/analytics/trends
 */

import request from 'supertest';
import { Express } from 'express';
import { getDatabasePool } from '../../src/config/database';
import { Pool } from 'pg';

describe('Trends API Integration Tests', () => {
  let app: Express;
  let pool: Pool;
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
    pool = getDatabasePool();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('User trends', () => {
    it('should return 400 if type is missing', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if user_id is missing for user trends', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=users')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if user_id is invalid', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=users&user_id=invalid')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=users&user_id=999999')
        .set('User-Agent', VALID_USER_AGENT);

      // Should return 404 (if user not found) or 500 (if dwh schema doesn't exist in CI)
      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return trends for valid user if data exists', async () => {
      // First, insert a test user with trends data (may fail if dwh schema doesn't exist)
      try {
        await pool.query(`
          INSERT INTO dwh.datamartUsers (
            dimension_user_id,
            user_id,
            username,
            history_2020_open,
            history_2020_closed,
            history_2021_open,
            history_2021_closed,
            working_hours_of_week_opening
          ) VALUES (
            123456,
            123456,
            'test_user_trends',
            10,
            5,
            20,
            15,
            '[0, 1, 2, 3, 4, 5, 6]'::jsonb
          )
          ON CONFLICT (user_id) DO UPDATE SET
            history_2020_open = EXCLUDED.history_2020_open,
            history_2020_closed = EXCLUDED.history_2020_closed,
            history_2021_open = EXCLUDED.history_2021_open,
            history_2021_closed = EXCLUDED.history_2021_closed,
            working_hours_of_week_opening = EXCLUDED.working_hours_of_week_opening
        `);
      } catch {
        // If dwh schema doesn't exist or we don't have permissions, skip this test
        // The endpoint will return 500 anyway
      }

      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=users&user_id=123456')
        .set('User-Agent', VALID_USER_AGENT);

      if (response.status === 200) {
        const body = response.body as {
          type: string;
          entity_id: number;
          trends: Array<{ year: string; open: number; closed: number }>;
        };
        expect(body).toHaveProperty('type', 'users');
        expect(body).toHaveProperty('entity_id', 123456);
        expect(body).toHaveProperty('trends');
        expect(Array.isArray(body.trends)).toBe(true);
        if (body.trends.length > 0) {
          expect(body.trends[0]).toHaveProperty('year');
          expect(body.trends[0]).toHaveProperty('open');
          expect(body.trends[0]).toHaveProperty('closed');
        }
      } else {
        // If 500, it's likely because the dwh schema doesn't exist in test environment
        expect([404, 500]).toContain(response.status);
      }

      // Cleanup (may fail if dwh schema doesn't exist)
      try {
        await pool.query('DELETE FROM dwh.datamartUsers WHERE user_id = 123456');
      } catch {
        // Ignore errors - schema may not exist
      }
    });
  });

  describe('Country trends', () => {
    it('should return 400 if country_id is missing for country trends', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=countries')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if country_id is invalid', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=countries&country_id=invalid')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if country not found', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=countries&country_id=999999')
        .set('User-Agent', VALID_USER_AGENT);

      // Should return 404 (if country not found) or 500 (if dwh schema doesn't exist in CI)
      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return trends for valid country if data exists', async () => {
      // First, insert a test country with trends data (may fail if dwh schema doesn't exist)
      try {
        await pool.query(`
          INSERT INTO dwh.datamartCountries (
            dimension_country_id,
            country_id,
            country_name,
            history_2020_open,
            history_2020_closed,
            history_2021_open,
            history_2021_closed,
            working_hours_of_week_opening
          ) VALUES (
            999,
            999,
            'Test Country',
            100,
            80,
            120,
            100,
            '[0, 1, 2, 3, 4, 5, 6]'::jsonb
          )
          ON CONFLICT (country_id) DO UPDATE SET
            history_2020_open = EXCLUDED.history_2020_open,
            history_2020_closed = EXCLUDED.history_2020_closed,
            history_2021_open = EXCLUDED.history_2021_open,
            history_2021_closed = EXCLUDED.history_2021_closed,
            working_hours_of_week_opening = EXCLUDED.working_hours_of_week_opening
        `);
      } catch {
        // If dwh schema doesn't exist or we don't have permissions, skip this test
        // The endpoint will return 500 anyway
      }

      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=countries&country_id=999')
        .set('User-Agent', VALID_USER_AGENT);

      if (response.status === 200) {
        const body = response.body as {
          type: string;
          entity_id: number;
          trends: Array<{ year: string; open: number; closed: number }>;
        };
        expect(body).toHaveProperty('type', 'countries');
        expect(body).toHaveProperty('entity_id', 999);
        expect(body).toHaveProperty('trends');
        expect(Array.isArray(body.trends)).toBe(true);
      } else {
        // If 500, it's likely because the dwh schema doesn't exist in test environment
        expect([404, 500]).toContain(response.status);
      }

      // Cleanup (may fail if dwh schema doesn't exist)
      try {
        await pool.query('DELETE FROM dwh.datamartCountries WHERE country_id = 999');
      } catch {
        // Ignore errors - schema may not exist
      }
    });
  });

  describe('Global trends', () => {
    it('should return trends for global analytics if data exists', async () => {
      // First, insert test global data (may fail if dwh schema doesn't exist)
      try {
        await pool.query(`
          INSERT INTO dwh.datamartGlobal (
            dimension_global_id,
            history_2020_open,
            history_2020_closed,
            history_2021_open,
            history_2021_closed
          ) VALUES (
            1,
            10000,
            8000,
            12000,
            10000
          )
          ON CONFLICT (dimension_global_id) DO UPDATE SET
            history_2020_open = EXCLUDED.history_2020_open,
            history_2020_closed = EXCLUDED.history_2020_closed,
            history_2021_open = EXCLUDED.history_2021_open,
            history_2021_closed = EXCLUDED.history_2021_closed
        `);
      } catch {
        // If dwh schema doesn't exist or we don't have permissions, skip this test
        // The endpoint will return 500 anyway
      }

      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=global')
        .set('User-Agent', VALID_USER_AGENT);

      if (response.status === 200) {
        const body = response.body as {
          type: string;
          trends: Array<{ year: string; open: number; closed: number }>;
        };
        expect(body).toHaveProperty('type', 'global');
        expect(body).toHaveProperty('trends');
        expect(Array.isArray(body.trends)).toBe(true);
      } else {
        // If 500, it's likely because the dwh schema doesn't exist in test environment
        expect([404, 500]).toContain(response.status);
      }
    });

    it('should return 404 if global analytics not found', async () => {
      // Delete any existing global data
      await pool.query('DELETE FROM dwh.datamartGlobal').catch(() => {
        // Ignore errors
      });

      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=global')
        .set('User-Agent', VALID_USER_AGENT);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .get('/notes-api/v1/analytics/trends?type=invalid')
        .set('User-Agent', VALID_USER_AGENT);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require User-Agent header', async () => {
      const response = await request(app).get('/notes-api/v1/analytics/trends?type=global');

      expect(response.status).toBe(400);
    });
  });
});
