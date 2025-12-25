/**
 * Integration tests for anti-abuse middleware
 */

import request from 'supertest';
import { Express } from 'express';

describe('Anti-Abuse Middleware Integration', () => {
  let app: Express;

  beforeAll(async () => {
    // Set required environment variables before importing app
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_NAME = process.env.DB_NAME || 'test_db';
    process.env.DB_USER = process.env.DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_pass';

    const { default: createApp } = await import('../../../src/index');
    app = createApp();
  });

  describe('AI detection', () => {
    it('should block AI User-Agent without OAuth (403)', async () => {
      const aiUserAgents = [
        'ChatGPT/1.0 (https://openai.com)',
        'GPT-4/1.0 (https://openai.com)',
        'Claude/1.0 (https://anthropic.com)',
      ];

      for (const userAgent of aiUserAgents) {
        const response = await request(app).get('/api/v1').set('User-Agent', userAgent);

        expect(response.status).toBe(403);
        const body = response.body as {
          error: string;
          message: string;
          statusCode: number;
        };
        expect(body.error).toBe('Forbidden');
        expect(body.message).toContain('AI agents require OAuth');
      }
    });

    it('should allow legitimate User-Agents', async () => {
      const legitimateUserAgent = 'MyApp/1.0 (contact@example.com)';

      const response = await request(app).get('/api/v1').set('User-Agent', legitimateUserAgent);

      expect(response.status).toBe(200);
    });
  });

  describe('Bot detection', () => {
    it('should detect known bot User-Agents', async () => {
      const botUserAgents = ['curl/7.68.0', 'python-requests/2.28.1', 'Wget/1.21.3'];

      for (const userAgent of botUserAgents) {
        const response = await request(app).get('/api/v1').set('User-Agent', userAgent);

        // Bots should be allowed but flagged for restrictive rate limiting
        // The middleware should pass but mark the request as bot
        expect([200, 429]).toContain(response.status);
      }
    });
  });

  describe('Legitimate applications', () => {
    it('should allow legitimate applications', async () => {
      const legitimateUserAgents = [
        'Terranote/1.0 (https://github.com/Terranote/terranote-core)',
        'ResearchTool/0.5 (researcher@university.edu)',
        'MyOSMApp/1.0 (contact@example.com)',
      ];

      for (const userAgent of legitimateUserAgents) {
        const response = await request(app).get('/api/v1').set('User-Agent', userAgent);

        expect(response.status).toBe(200);
      }
    });
  });
});
