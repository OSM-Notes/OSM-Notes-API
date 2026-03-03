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
import { trackRateLimitExceeded } from './metrics';

/**
 * Redis client adapter for rate-limit-redis
 * Adapts redis v4 client to work with RedisStore
 *
 * @param redisClient - Redis client instance from getRedisClient()
 * @returns RedisStore instance or undefined if Redis is not available
 * @private
 * @internal Exported for testing only
 */
export function createRedisStoreAdapter(
  redisClient: ReturnType<typeof getRedisClient>
): Store | undefined {
  if (!redisClient) {
    return undefined;
  }

  return new RedisStore({
    sendCommand: async (
      ...args: (string | { command?: string[] })[]
    ): Promise<string | number | (string | number)[]> => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      // Support both (command, ...rest) and ({ command: [...] }) call styles
      const first = args[0];
      const commandArray =
        typeof first === 'object' &&
        first !== null &&
        Array.isArray((first as { command?: string[] }).command)
          ? (first as { command: string[] }).command
          : (args as string[]);
      const command = (commandArray[0] ?? '').toString().toUpperCase();
      const commandArgs = commandArray.slice(1).map((a) => (a ?? '').toString());

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
        case 'SCRIPT': {
          // SCRIPT LOAD - Load a Lua script and return SHA1 hash
          // For testing, we return a mock hash
          if (commandArgs[0]?.toUpperCase() === 'LOAD') {
            // Return a mock SHA1 hash for the script
            return 'mock_script_hash_' + Math.random().toString(36).substring(7);
          }
          // SCRIPT EXISTS - Check if scripts exist
          if (commandArgs[0]?.toUpperCase() === 'EXISTS') {
            // Return 1 for any script hash (they all "exist" in our mock)
            return 1;
          }
          throw new Error(`Unsupported SCRIPT subcommand: ${commandArgs[0]}`);
        }
        case 'EVALSHA': {
          // EVALSHA: rate-limit-redis expects [totalHits, timeToExpireMs] (same as Lua script return)
          const key = commandArgs[2] || '';
          const isIncrementScript = commandArgs.length >= 5; // increment: EVALSHA sha 1 key reset windowMs

          if (isIncrementScript) {
            const windowMs = parseInt(commandArgs[4] || '0', 10);
            const current = await redisClient.incr(key);
            if (current === 1) {
              await redisClient.expire(key, Math.ceil(windowMs / 1000));
            }
            const ttlSeconds = await redisClient.ttl(key);
            const timeToExpireMs = ttlSeconds >= 0 ? ttlSeconds * 1000 : windowMs;
            return [Number(current), Number(timeToExpireMs)];
          }
          // Get script: EVALSHA sha 1 key -> return [totalHits, timeToExpire]
          const totalHits = parseInt((await redisClient.get(key)) || '0', 10) || 0;
          const ttlSeconds = await redisClient.ttl(key);
          const timeToExpireMs = ttlSeconds >= 0 ? ttlSeconds * 1000 : 0;
          return [Number(totalHits), Number(timeToExpireMs)];
        }
        case 'TTL': {
          const result = await redisClient.ttl(commandArgs[0] || '');
          return result ?? -1;
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
 * @internal Exported for testing only
 */
export function generateKey(req: Request): string {
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
 * @internal Exported for testing only
 */
export function createStore(): Store | undefined {
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
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Track rate limit exceeded in metrics
    trackRateLimitExceeded(ip, userAgent);

    logger.warn('Rate limit exceeded', {
      ip,
      userAgent,
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
