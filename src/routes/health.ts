/**
 * Health check routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { testConnection as testDatabaseConnection, getDatabasePool } from '../config/database';
import { testRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import { getDwhSchemaCheckConfigFromEnv, runDwhSchemaCheck } from '../utils/dwhSchemaContract';

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
  /** OSM-Notes-Analytics DWH contract (public.schema_version component dwh) */
  dwhSchema?: {
    status: 'ok' | 'disabled' | 'missing' | 'incompatible' | 'error';
    version?: string;
    details?: string;
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
    const redisHost = (process.env.REDIS_HOST || '').trim().toLowerCase();
    if (!redisHost || redisHost === '' || redisHost === 'disabled' || redisHost === 'off') {
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
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Verifies the status of the API and its dependencies
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [up, down]
 *                     responseTime:
 *                       type: integer
 *                 redis:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [up, down, not_configured]
 *       503:
 *         description: Service unhealthy
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

    // Optional: DWH schema version contract (same table/semantics as OSM-Notes-Analytics)
    if (health.database.status === 'up') {
      try {
        const dwhCfg = getDwhSchemaCheckConfigFromEnv();
        if (!dwhCfg.enabled) {
          health.dwhSchema = { status: 'disabled' };
        } else {
          const dwhResult = await runDwhSchemaCheck(getDatabasePool(), dwhCfg);
          if (dwhResult.status === 'ok') {
            health.dwhSchema = { status: 'ok', version: dwhResult.version };
          } else {
            health.dwhSchema = {
              status: dwhResult.status,
              version: dwhResult.version,
              details: dwhResult.details,
            };
            if (health.status === 'healthy') {
              health.status = 'degraded';
            }
          }
        }
      } catch (e) {
        health.dwhSchema = {
          status: 'error',
          details: e instanceof Error ? e.message : String(e),
        };
        if (health.status === 'healthy') {
          health.status = 'degraded';
        }
      }
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
