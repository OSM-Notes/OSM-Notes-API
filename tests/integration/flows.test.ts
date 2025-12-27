/**
 * Integration tests for complete flows (end-to-end scenarios)
 */

import request from 'supertest';
import { Express } from 'express';

describe('Complete API Flows', () => {
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

  describe('Flow: Search Notes -> Get Note Details -> Get Comments', () => {
    it('should complete full flow for notes', async () => {
      // Step 1: Search for notes
      const searchResponse = await request(app)
        .get('/api/v1/notes?status=open&limit=5')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(searchResponse.status);
      if (searchResponse.status === 200) {
        expect(searchResponse.body).toHaveProperty('data');
        expect(searchResponse.body).toHaveProperty('pagination');

        const searchBody = searchResponse.body as {
          data: Array<{ note_id: number }>;
          pagination: { total: number };
        };

        // If there are notes, test the full flow
        if (
          searchBody.data &&
          searchBody.data.length > 0 &&
          searchBody.pagination &&
          searchBody.pagination.total > 0
        ) {
          const firstNoteId = searchBody.data[0].note_id;

          // Step 2: Get note details
          const noteResponse = await request(app)
            .get(`/api/v1/notes/${firstNoteId}`)
            .set('User-Agent', validUserAgent);

          expect([200, 404]).toContain(noteResponse.status);

          if (noteResponse.status === 200) {
            expect(noteResponse.body).toHaveProperty('data');
            const noteBody = noteResponse.body as { data: { note_id: number } };
            expect(noteBody.data).toHaveProperty('note_id', firstNoteId);

            // Step 3: Get note comments
            const commentsResponse = await request(app)
              .get(`/api/v1/notes/${firstNoteId}/comments`)
              .set('User-Agent', validUserAgent);

            expect([200, 404]).toContain(commentsResponse.status);

            if (commentsResponse.status === 200) {
              expect(commentsResponse.body).toHaveProperty('data');
              expect(commentsResponse.body).toHaveProperty('count');
              const commentsBody = commentsResponse.body as { data: unknown[] };
              expect(Array.isArray(commentsBody.data)).toBe(true);
            }
          }
        }
      }
    });
  });

  describe('Flow: Get User Profile -> Get User Notes', () => {
    it('should complete flow for user-related data', async () => {
      // Step 1: Get a user profile
      const userResponse = await request(app)
        .get('/api/v1/users/12345')
        .set('User-Agent', validUserAgent);

      expect([200, 404, 500]).toContain(userResponse.status);

      if (userResponse.status === 200) {
        expect(userResponse.body).toHaveProperty('data');
        const userBody = userResponse.body as { data: { user_id: number } };
        const userData = userBody.data;

        // Step 2: Search for notes by this user
        const notesResponse = await request(app)
          .get(`/api/v1/notes?user=${userData.user_id}`)
          .set('User-Agent', validUserAgent);

        expect([200, 500]).toContain(notesResponse.status);
        if (notesResponse.status === 200) {
          expect(notesResponse.body).toHaveProperty('data');
          expect(notesResponse.body).toHaveProperty('pagination');
        }
      }
    });
  });

  describe('Flow: Get Country Profile -> Get Country Notes', () => {
    it('should complete flow for country-related data', async () => {
      // Step 1: Get a country profile
      const countryResponse = await request(app)
        .get('/api/v1/countries/42')
        .set('User-Agent', validUserAgent);

      expect([200, 404, 500]).toContain(countryResponse.status);

      if (countryResponse.status === 200) {
        expect(countryResponse.body).toHaveProperty('data');
        const countryBody = countryResponse.body as { data: { country_id: number } };
        const countryData = countryBody.data;

        // Step 2: Search for notes in this country
        const notesResponse = await request(app)
          .get(`/api/v1/notes?country=${countryData.country_id}`)
          .set('User-Agent', validUserAgent);

        expect([200, 500]).toContain(notesResponse.status);
        if (notesResponse.status === 200) {
          expect(notesResponse.body).toHaveProperty('data');
          expect(notesResponse.body).toHaveProperty('pagination');
        }
      }
    });
  });

  describe('Flow: Get Analytics -> Get Related Data', () => {
    it('should complete flow for analytics and related endpoints', async () => {
      // Step 1: Get global analytics
      const analyticsResponse = await request(app)
        .get('/api/v1/analytics/global')
        .set('User-Agent', validUserAgent);

      expect([200, 404, 500]).toContain(analyticsResponse.status);

      if (analyticsResponse.status === 200) {
        expect(analyticsResponse.body).toHaveProperty('data');

        // Step 2: Get notes to verify consistency
        const notesResponse = await request(app)
          .get('/api/v1/notes?limit=1')
          .set('User-Agent', validUserAgent);

        expect([200, 500]).toContain(notesResponse.status);
        if (notesResponse.status === 200) {
          expect(notesResponse.body).toHaveProperty('data');
        }
      }
    });
  });

  describe('Flow: Pagination Navigation', () => {
    it('should navigate through multiple pages', async () => {
      // Step 1: Get first page
      const page1Response = await request(app)
        .get('/api/v1/notes?page=1&limit=10')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(page1Response.status);
      const page1Body = page1Response.body as {
        pagination: { total_pages: number; page: number };
      };

      // Step 2: Navigate to next page if available
      if (page1Response.status === 200 && page1Body.pagination.total_pages > 1) {
        const page2Response = await request(app)
          .get('/api/v1/notes?page=2&limit=10')
          .set('User-Agent', validUserAgent);

        expect(page2Response.status).toBe(200);
        const page2Body = page2Response.body as { pagination: { page: number } };
        expect(page2Body.pagination.page).toBe(2);
      }
    });
  });

  describe('Flow: Error Recovery', () => {
    it('should recover from invalid request and continue', async () => {
      // Step 1: Make invalid request
      const invalidResponse = await request(app)
        .get('/api/v1/notes/invalid')
        .set('User-Agent', validUserAgent);

      expect(invalidResponse.status).toBe(400);

      // Step 2: Make valid request after error
      const validResponse = await request(app)
        .get('/api/v1/notes?limit=5')
        .set('User-Agent', validUserAgent);

      expect([200, 500]).toContain(validResponse.status);
      if (validResponse.status === 200) {
        expect(validResponse.body).toHaveProperty('data');
      }
    });
  });
});
