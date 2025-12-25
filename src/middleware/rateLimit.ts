/**
 * Rate limiting middleware
 * Limits requests per IP + User-Agent combination
 *
 * @module middleware/rateLimit
 * @description
 * This middleware implements rate limiting using express-rate-limit with Redis as the backing store.
 * Rate limits are enforced per IP address and User-Agent combination to prevent abuse while
 * allowing legitimate applications to make requests.
 *
 * **Rate Limits:**
 * - Anonymous users: 50 requests per 15 minutes
 * - Per IP + User-Agent combination (different apps from same IP have separate limits)
 * - Health check endpoint (`/health`) is excluded from rate limiting
 *
 * **Headers:**
 * - `RateLimit-Limit`: Maximum number of requests allowed
 * - `RateLimit-Remaining`: Number of requests remaining in current window
 * - `RateLimit-Reset`: Unix timestamp when the rate limit resets
 *
 * **Error Response (429):**
 * When rate limit is exceeded, returns:
 * ```json
 * {
 *   "error": "Too Many Requests",
 *   "message": "Rate limit exceeded. Maximum 50 requests per 15 minutes allowed.",
 *   "statusCode": 429
 * }
 * ```
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Store } from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Redis client adapter for rate-limit-redis
 * Adapts redis v4 client to work with RedisStore
 *
 * @param redisClient - Redis client instance from getRedisClient()
 * @returns RedisStore instance or undefined if Redis is not available
 * @private
 */
function createRedisStoreAdapter(
  redisClient: ReturnType<typeof getRedisClient>
): Store | undefined {
  if (!redisClient) {
    return undefined;
  }

  return new RedisStore({
    sendCommand: async (...args: string[]): Promise<string | number> => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      const command = args[0]?.toUpperCase() || '';
      const commandArgs = args.slice(1);

      // Map commands to redis v4 methods
      switch (command) {
        case 'INCR': {
          const result = await redisClient.incr(commandArgs[0] || '');
          return result ?? 0;
        }
        case 'EXPIRE': {
          const result = await redisClient.expire(
            commandArgs[0] || '',
            parseInt(commandArgs[1] || '0', 10)
          );
          return result ? 1 : 0;
        }
        case 'GET': {
          const result = await redisClient.get(commandArgs[0] || '');
          return result ?? '';
        }
        case 'SET': {
          const result = await redisClient.set(commandArgs[0] || '', commandArgs[1] || '');
          return result ?? '';
        }
        case 'DEL': {
          const result = await redisClient.del(commandArgs[0] || '');
          return result ?? 0;
        }
        default:
          throw new Error(`Unsupported Redis command: ${command}`);
      }
    },
  });
}

/**
 * Generate a key for rate limiting based on IP and User-Agent
 *
 * @param req - Express request object
 * @returns Rate limit key in format: `rate_limit:{ip}:{userAgent}`
 * @private
 *
 * @example
 * // Key format: "rate_limit:192.168.1.1:MyApp/1.0"
 * // Uses User-Agent info if available from validateUserAgent middleware
 */
function generateKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  // Use User-Agent info if available (from validateUserAgent middleware)
  const userAgentInfo = (req as Request & { userAgentInfo?: { appName: string; version: string } })
    .userAgentInfo;
  const identifier = userAgentInfo
    ? `${userAgentInfo.appName}/${userAgentInfo.version}`
    : userAgent;

  return `rate_limit:${ip}:${identifier}`;
}

/**
 * Create rate limit store (Redis if available, otherwise memory)
 *
 * @returns Store instance (RedisStore or undefined for memory store)
 * @private
 *
 * @description
 * Attempts to create a Redis store for distributed rate limiting.
 * Falls back to in-memory store if Redis is not available or connection fails.
 * This ensures graceful degradation when Redis is unavailable.
 */
function createStore(): Store | undefined {
  const redisClient = getRedisClient();

  if (redisClient) {
    try {
      const store = createRedisStoreAdapter(redisClient);
      if (store) {
        logger.info('Using Redis store for rate limiting');
        return store;
      }
    } catch (error) {
      logger.warn('Failed to create Redis store, using memory store', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Fallback to memory store if Redis is not available
  logger.warn('Using in-memory rate limit store (Redis not available)');
  return undefined; // express-rate-limit will use memory store by default
}

/**
 * Rate limit middleware instance
 *
 * @description
 * Express middleware that enforces rate limiting on all requests.
 * Uses Redis for distributed rate limiting when available, falls back to memory store.
 *
 * **Configuration:**
 * - Window: 15 minutes
 * - Max requests: 50 per window per IP + User-Agent
 * - Store: Redis (if available) or memory
 * - Key generator: IP + User-Agent combination
 * - Skip condition: Health check endpoint (`/health`)
 *
 * **Usage:**
 * ```typescript
 * import { rateLimitMiddleware } from './middleware/rateLimit';
 * app.use(rateLimitMiddleware);
 * ```
 *
 * @example
 * // Apply to all routes
 * app.use(rateLimitMiddleware);
 *
 * // Or apply to specific routes
 * app.use('/api/v1', rateLimitMiddleware);
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP + User-Agent to 50 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Maximum 50 requests per 15 minutes allowed.',
    statusCode: 429,
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  store: createStore(),
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Maximum 50 requests per 15 minutes allowed.',
      statusCode: 429,
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks (optional)
    return req.path === '/health';
  },
});
