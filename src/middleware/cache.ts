/**
 * Cache middleware
 * Implements response caching using Redis
 *
 * @module middleware/cache
 * @description
 * This middleware caches GET request responses in Redis to reduce database load
 * and improve response times. Only successful (2xx) responses are cached.
 *
 * **Features:**
 * - Cache hit/miss detection
 * - Configurable TTL per endpoint
 * - Automatic cache key generation from URL and query parameters
 * - Cache invalidation support
 * - Graceful degradation when Redis is unavailable
 *
 * **Headers:**
 * - `X-Cache`: Cache status (HIT, MISS, DISABLED)
 *
 * **Usage:**
 * ```typescript
 * // Default TTL (300 seconds)
 * router.get('/users/:id', cacheMiddleware({ ttl: 300 }), getUserProfile);
 *
 * // Custom TTL
 * router.get('/analytics/global', cacheMiddleware({ ttl: 600 }), getGlobalAnalytics);
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Cache middleware options
 */
export interface CacheOptions {
  /**
   * Time to live in seconds
   * @default 300 (5 minutes)
   */
  ttl?: number;
}

/**
 * Generate cache key from request
 * Format: cache:METHOD:PATH:QUERY_PARAMS
 *
 * @param req - Express request object
 * @returns Cache key string
 */
export function generateCacheKey(req: Request): string {
  const method = req.method.toUpperCase();
  const path = req.path || req.originalUrl.split('?')[0];
  const queryParams = Object.keys(req.query)
    .sort()
    .map((key) => `${key}=${String(req.query[key])}`)
    .join('&');

  return `cache:${method}:${path}:${queryParams}`;
}

/**
 * Cache middleware factory
 *
 * @param options - Cache configuration options
 * @returns Express middleware function
 */
export function cacheMiddleware(
  options: CacheOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const ttl = options.ttl ?? 300; // Default 5 minutes

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      res.setHeader('X-Cache', 'DISABLED');
      return next();
    }

    const redisClient = getRedisClient();

    // If Redis is not available, continue without caching
    if (!redisClient) {
      res.setHeader('X-Cache', 'DISABLED');
      return next();
    }

    const cacheKey = generateCacheKey(req);

    try {
      // Ensure Redis connection is open
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      // Check cache
      const cachedValue = await redisClient.get(cacheKey);

      if (cachedValue) {
        // Cache hit
        try {
          const cachedData = JSON.parse(cachedValue) as unknown;
          res.setHeader('X-Cache', 'HIT');
          res.json(cachedData);
          logger.debug('Cache hit', { key: cacheKey });
          return;
        } catch (parseError) {
          logger.warn('Failed to parse cached value', {
            key: cacheKey,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
          // Continue to handler if parsing fails
        }
      }

      // Cache miss - intercept response
      res.setHeader('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to capture response
      res.json = function (body?: unknown): Response {
        // Only cache successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Store in cache asynchronously (don't block response)
          void (async (): Promise<void> => {
            try {
              if (!redisClient.isOpen) {
                await redisClient.connect();
              }
              await redisClient.set(cacheKey, JSON.stringify(body), {
                EX: ttl,
              });
              logger.debug('Cached response', { key: cacheKey, ttl });
            } catch (cacheError) {
              logger.warn('Failed to cache response', {
                key: cacheKey,
                error: cacheError instanceof Error ? cacheError.message : String(cacheError),
              });
            }
          })();
        }

        // Call original json method
        return originalJson(body);
      };

      next();
    } catch (error) {
      // On error, continue without caching
      logger.warn('Cache middleware error', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      res.setHeader('X-Cache', 'DISABLED');
      next();
    }
  };
}

/**
 * Invalidate cache entry
 *
 * @param key - Cache key to invalidate
 */
export async function invalidateCache(key: string): Promise<void> {
  const redisClient = getRedisClient();

  if (!redisClient) {
    return;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.del(key);
    logger.debug('Cache invalidated', { key });
  } catch (error) {
    logger.warn('Failed to invalidate cache', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate cache by pattern (e.g., all user-related cache)
 *
 * @param pattern - Redis key pattern (e.g., 'cache:GET:/api/v1/users/*')
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  const redisClient = getRedisClient();

  if (!redisClient) {
    return;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // SCAN for keys matching pattern
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    // Delete all matching keys
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug('Cache invalidated by pattern', { pattern, count: keys.length });
    }
  } catch (error) {
    logger.warn('Failed to invalidate cache by pattern', {
      pattern,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
