/**
 * Rate limiting middleware
 * Limits requests per IP + User-Agent combination
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response } from 'express';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Redis client adapter for rate-limit-redis
 * Adapts redis v4 client to work with RedisStore
 */
function createRedisStoreAdapter(
  redisClient: ReturnType<typeof getRedisClient>
): RedisStore | undefined {
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
 */
function createStore(): RedisStore | undefined {
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
 * Rate limit configuration
 * - Anonymous users: 50 requests per 15 minutes
 * - Per IP + User-Agent combination
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
