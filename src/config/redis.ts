/**
 * Redis configuration and client setup
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { getEnv } from './env';

let redisClient: RedisClientType | null = null;

/**
 * Get Redis client instance (singleton)
 */
export function getRedisClient(): RedisClientType | null {
  if (redisClient) {
    return redisClient;
  }

  const env = getEnv();

  // If Redis is not configured or explicitly disabled, return null (graceful degradation)
  const host = (env.REDIS_HOST || '').trim().toLowerCase();
  if (!host || host === '' || host === 'disabled' || host === 'off') {
    logger.warn('Redis not configured, rate limiting will use in-memory store');
    return null;
  }

  try {
    const client = createClient({
      socket: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
      },
      password: env.REDIS_PASSWORD || undefined,
      database: env.REDIS_DB,
    });

    // node-redis reconnects aggressively; without throttling, logs flood on ECONNREFUSED
    let redisErrorLogAt = 0;
    let redisErrorSuppressed = 0;
    const REDIS_ERROR_LOG_MIN_INTERVAL_MS = 30_000;

    client.on('error', (err: Error) => {
      const now = Date.now();
      if (now - redisErrorLogAt < REDIS_ERROR_LOG_MIN_INTERVAL_MS) {
        redisErrorSuppressed++;
        return;
      }
      redisErrorLogAt = now;
      const suppressed = redisErrorSuppressed;
      redisErrorSuppressed = 0;

      const base = {
        error: err.message,
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        ...(suppressed > 0 ? { similarErrorsSuppressed: suppressed } : {}),
        ...(err.message.includes('ECONNREFUSED')
          ? {
              hint: 'No Redis at this host:port — start Redis, fix REDIS_HOST/REDIS_PORT, or set REDIS_HOST=disabled for in-memory rate limit and cache',
            }
          : {}),
      };

      logger.error('Redis client error', base);
    });

    client.on('connect', () => {
      logger.info('Redis client connected', {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
      });
    });

    client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
    });

    redisClient = client as RedisClientType;
    return redisClient;
  } catch (error) {
    logger.error('Failed to create Redis client', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    if (!client.isOpen) {
      await client.connect();
      logger.info('Redis connection established');
    }
  } catch (error) {
    logger.error('Failed to connect to Redis', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
      redisClient = null;
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Reset Redis client (useful for testing)
 */
export function resetRedisClient(): void {
  redisClient = null;
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (!client.isOpen) {
      await client.connect();
    }
    await client.ping();
    return true;
  } catch (error) {
    logger.error('Redis connection test failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
