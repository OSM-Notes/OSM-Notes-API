/**
 * Integration tests for GET /notes-api/v1/notes/:id/classification.
 */

import request from 'supertest';
import { Express } from 'express';
import { resetEnv } from '../../src/config/env';
import type { NoteMlClassification } from '../../src/types';

interface ClassificationResponseBody {
  data: NoteMlClassification | null;
  attribution?: { text: string; url: string };
}

describe('Note classification endpoint', () => {
  const validUserAgent = 'TestApp/1.0 (test@example.com)';

  async function loadAppWithMl(enabled: 'true' | 'false'): Promise<Express> {
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'osm_notes_api_test';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';
    process.env.REDIS_HOST = '';
    process.env.ML_NOTE_CLASSIFICATION_ENABLED = enabled;
    resetEnv();
    const { default: createApp } = await import('../../src/index');
    return createApp();
  }

  describe('when ML_NOTE_CLASSIFICATION_ENABLED is false', () => {
    let app: Express;

    beforeAll(async () => {
      app = await loadAppWithMl('false');
    });

    it('returns 501 for GET classification', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/12345/classification')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(501);
      expect(response.body).toHaveProperty('message');
      const errBody = response.body as { message?: string };
      expect(String(errBody.message)).toMatch(/ML note classification is disabled/i);
    });
  });

  describe('when ML_NOTE_CLASSIFICATION_ENABLED is true', () => {
    let app: Express;

    beforeAll(async () => {
      app = await loadAppWithMl('true');
    });

    it('returns 200 with data null or object (or 500 if DWH table missing)', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/12345/classification')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        const body = response.body as ClassificationResponseBody;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('attribution');
        const data = body.data;
        if (data !== null) {
          expect(data).toHaveProperty('note_id');
          expect(data).toHaveProperty('main_category');
          expect(data).toHaveProperty('specific_type');
          expect(data).toHaveProperty('classification_timestamp');
          expect(data).toHaveProperty('updated_at');
        }
      }
    });

    it('returns 400 for invalid note id', async () => {
      const response = await request(app)
        .get('/notes-api/v1/notes/not-a-number/classification')
        .set('User-Agent', validUserAgent);

      expect(response.status).toBe(400);
    });

    it('requires User-Agent', async () => {
      const response = await request(app).get('/notes-api/v1/notes/1/classification');

      expect(response.status).toBe(400);
    });
  });
});
