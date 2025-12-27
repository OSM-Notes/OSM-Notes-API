/**
 * Unit tests for health check route
 */

import express, { Express } from 'express';
import request from 'supertest';
import { Response } from 'supertest';
import healthRouter from '../../../src/routes/health';
import { testConnection as testDatabaseConnection } from '../../../src/config/database';
import { testRedisConnection } from '../../../src/config/redis';
import { logger } from '../../../src/utils/logger';

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  database: {
    status: 'up' | 'down';
    responseTime?: number;
  };
  redis: {
    status: 'up' | 'down' | 'not_configured';
    responseTime?: number;
  };
}

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  testConnection: jest.fn(),
}));

jest.mock('../../../src/config/redis', () => ({
  testRedisConnection: jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Health Check Route', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);

    // Reset environment
    delete process.env.REDIS_HOST;
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status when database and Redis are up', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
      (testRedisConnection as jest.Mock).mockResolvedValue(true);
      process.env.REDIS_HOST = 'localhost';

      const response: Response = await request(app).get('/health');

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.body as HealthCheckResponse;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      expect(body).toMatchObject({
        status: 'healthy',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        database: expect.objectContaining({
          status: 'up',
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        redis: expect.objectContaining({
          status: 'up',
        }),
      });
    });

    it('should return degraded status when Redis is down but database is up', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
      (testRedisConnection as jest.Mock).mockResolvedValue(false);
      process.env.REDIS_HOST = 'localhost';

      const response: Response = await request(app).get('/health');

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.body as HealthCheckResponse;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      expect(body).toMatchObject({
        status: 'degraded',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        database: expect.objectContaining({
          status: 'up',
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        redis: expect.objectContaining({
          status: 'down',
        }),
      });
    });

    it('should return unhealthy status when database is down', async () => {
      (testDatabaseConnection as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );
      process.env.REDIS_HOST = '';

      const response: Response = await request(app).get('/health');

      expect(response.status).toBe(503);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.body as HealthCheckResponse;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      expect(body).toMatchObject({
        status: 'unhealthy',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        database: expect.objectContaining({
          status: 'down',
        }),
      });
      expect(logger.error).toHaveBeenCalledWith('Database health check failed', expect.any(Object));
    });

    it('should return unhealthy status when database is down and Redis is down', async () => {
      (testDatabaseConnection as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );
      (testRedisConnection as jest.Mock).mockResolvedValue(false);
      process.env.REDIS_HOST = 'localhost';

      const response: Response = await request(app).get('/health');

      expect(response.status).toBe(503);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.body as HealthCheckResponse;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      expect(body).toMatchObject({
        status: 'unhealthy',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        database: expect.objectContaining({
          status: 'down',
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        redis: expect.objectContaining({
          status: 'down',
        }),
      });
    });

    it('should return not_configured for Redis when REDIS_HOST is empty', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
      process.env.REDIS_HOST = '';

      const response: Response = await request(app).get('/health');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.body as HealthCheckResponse;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      expect(body).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        redis: expect.objectContaining({
          status: 'not_configured',
        }),
      });
    });

    it('should handle Redis connection error', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
      (testRedisConnection as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));
      process.env.REDIS_HOST = 'localhost';

      const response: Response = await request(app).get('/health');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.body as HealthCheckResponse;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      expect(body).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        redis: expect.objectContaining({
          status: 'down',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          responseTime: expect.any(Number),
        }),
      });
      expect(logger.error).toHaveBeenCalledWith('Redis health check failed', expect.any(Object));
    });

    it('should include timestamp in response', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
      process.env.REDIS_HOST = '';

      const response: Response = await request(app).get('/health');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.body as HealthCheckResponse;
      expect(body).toHaveProperty('timestamp');
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should log health check information', async () => {
      (testDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
      process.env.REDIS_HOST = '';

      await request(app).get('/health');

      expect(logger.info).toHaveBeenCalledWith(
        'Health check performed',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          status: expect.any(String),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          database: expect.any(String),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          redis: expect.any(String),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          responseTime: expect.any(Number),
        })
      );
    });
  });
});
