/**
 * Health check routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { testConnection as testDatabaseConnection } from '../config/database';
import { testRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

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

/**
 * Test Redis connection
 */
async function testRedisHealth(): Promise<{
  status: 'up' | 'down' | 'not_configured';
  responseTime?: number;
}> {
  const startTime = Date.now();

  try {
    const redisHost = process.env.REDIS_HOST;
    if (!redisHost || redisHost === '') {
      return { status: 'not_configured' };
    }

    const isConnected = await testRedisConnection();
    return {
      status: isConnected ? 'up' : 'down',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Redis health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Async wrapper for route handlers
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /health
 * Health check endpoint
 */
router.get(
  '/',
  // eslint-disable-next-line @typescript-eslint/require-await
  asyncHandler(async (_req: Request, res: Response) => {
    const startTime = Date.now();
    const health: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'down',
      },
      redis: {
        status: 'not_configured',
      },
    };

    // Check database connection
    try {
      const dbStartTime = Date.now();
      await testDatabaseConnection();
      health.database = {
        status: 'up',
        responseTime: Date.now() - dbStartTime,
      };
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      health.database = {
        status: 'down',
      };
      health.status = 'unhealthy';
    }

    // Check Redis connection
    const redisStatus = await testRedisHealth();
    health.redis = redisStatus;
    if (redisStatus.status === 'down') {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Determine overall status
    const responseTime = Date.now() - startTime;
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    logger.info('Health check performed', {
      status: health.status,
      database: health.database.status,
      redis: health.redis.status,
      responseTime,
    });

    res.status(statusCode).json(health);
  })
);

export default router;
