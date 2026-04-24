/**
 * Rate limiting middleware
 * Limits requests per IP + User-Agent combination, with stricter tiers for detected bots
 * and an aggregate cap per IP to reduce User-Agent rotation abuse.
 *
 * @module middleware/rateLimit
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Store } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { trackRateLimitExceeded } from './metrics';

/** Anonymous clients: requests per rolling window */
export const RATE_LIMIT_ANON_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_ANON_MAX = 50;

/** Detected automation clients (curl, python-requests, etc.): per ADR-0005 */
export const RATE_LIMIT_BOT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_BOT_MAX = 10;

/** Aggregate cap per IP (all UAs), same window as anonymous tier */
export const RATE_LIMIT_PER_IP_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_PER_IP_MAX = 150;

type RequestWithFlags = Request & {
  isBot?: boolean;
  userAgentInfo?: { appName: string; version: string };
};

/**
 * Redis client adapter for rate-limit-redis
 * @internal Exported for testing only
 */
export function createRedisStoreAdapter(
  redisClient: ReturnType<typeof getRedisClient>,
  /** Unique per rate limiter — required by express-rate-limit when using multiple limiters with Redis */
  prefix = 'rl:'
): Store | undefined {
  if (!redisClient) {
    return undefined;
  }

  return new RedisStore({
    prefix,
    sendCommand: async (
      ...args: (string | { command?: string[] })[]
    ): Promise<string | number | (string | number)[]> => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      const first = args[0];
      const commandArray =
        typeof first === 'object' &&
        first !== null &&
        Array.isArray((first as { command?: string[] }).command)
          ? (first as { command: string[] }).command
          : (args as string[]);
      const command = (commandArray[0] ?? '').toString().toUpperCase();
      const commandArgs = commandArray.slice(1).map((a) => (a ?? '').toString());

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
          if (commandArgs[0]?.toUpperCase() === 'LOAD') {
            return 'mock_script_hash_' + Math.random().toString(36).substring(7);
          }
          if (commandArgs[0]?.toUpperCase() === 'EXISTS') {
            return 1;
          }
          throw new Error(`Unsupported SCRIPT subcommand: ${commandArgs[0]}`);
        }
        case 'EVALSHA': {
          const key = commandArgs[2] || '';
          const isIncrementScript = commandArgs.length >= 5;

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
 * Key for per-client buckets (anonymous or bot — separate prefixes, mutually exclusive middleware).
 * @internal Exported for testing only
 */
export function generateClientKey(req: Request, bucketPrefix: 'anon' | 'bot'): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const userAgentInfo = (req as RequestWithFlags).userAgentInfo;
  const identifier = userAgentInfo
    ? `${userAgentInfo.appName}/${userAgentInfo.version}`
    : userAgent;

  return `rate_limit:${bucketPrefix}:${ip}:${identifier}`;
}

/**
 * @deprecated Use generateClientKey(req, 'anon') for new code; kept for tests that expect the old name.
 */
export function generateKey(req: Request): string {
  return generateClientKey(req, 'anon');
}

/**
 * Aggregate per-IP key (all clients).
 * @internal Exported for testing only
 */
export function generateIpKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `rate_limit:ip:${ip}`;
}

/**
 * @internal Exported for testing only
 */
let loggedRateLimitBackend = false;

export function createStore(redisKeyPrefix = 'rl:'): Store | undefined {
  const redisClient = getRedisClient();

  if (redisClient) {
    try {
      const store = createRedisStoreAdapter(redisClient, redisKeyPrefix);
      if (store) {
        if (!loggedRateLimitBackend) {
          logger.info('Using Redis store for rate limiting');
          loggedRateLimitBackend = true;
        }
        return store;
      }
    } catch (error) {
      logger.warn('Failed to create Redis store, using memory store', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!loggedRateLimitBackend) {
    logger.warn('Using in-memory rate limit store (Redis not available)');
    loggedRateLimitBackend = true;
  }
  return undefined;
}

/** Separate Store instances — sharing one RedisStore across limiters triggers ERR_ERL_STORE_REUSE */
const rateLimitStoreBot = createStore('rl:bot:');
const rateLimitStoreAnon = createStore('rl:anon:');
const rateLimitStorePerIp = createStore('rl:ip:');

function skipHealth(req: Request): boolean {
  return req.path === '/health';
}

const rateLimitBotClientMiddleware = rateLimit({
  windowMs: RATE_LIMIT_BOT_WINDOW_MS,
  max: RATE_LIMIT_BOT_MAX,
  message: {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Detected automation User-Agent: maximum ${RATE_LIMIT_BOT_MAX} requests per hour allowed.`,
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStoreBot,
  keyGenerator: (req: Request) => generateClientKey(req, 'bot'),
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    trackRateLimitExceeded(ip, userAgent);
    logger.warn('Rate limit exceeded (bot tier)', { ip, userAgent, path: req.path });
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Detected automation User-Agent: maximum ${RATE_LIMIT_BOT_MAX} requests per hour allowed.`,
      statusCode: 429,
    });
  },
  skip: (req: Request) => skipHealth(req) || !(req as RequestWithFlags).isBot,
});

const rateLimitAnonymousClientMiddleware = rateLimit({
  windowMs: RATE_LIMIT_ANON_WINDOW_MS,
  max: RATE_LIMIT_ANON_MAX,
  message: {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Maximum ${RATE_LIMIT_ANON_MAX} requests per 15 minutes allowed per application (IP + User-Agent).`,
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStoreAnon,
  keyGenerator: (req: Request) => generateClientKey(req, 'anon'),
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    trackRateLimitExceeded(ip, userAgent);
    logger.warn('Rate limit exceeded (anonymous client tier)', { ip, userAgent, path: req.path });
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_ANON_MAX} requests per 15 minutes allowed per application (IP + User-Agent).`,
      statusCode: 429,
    });
  },
  skip: (req: Request) => skipHealth(req) || !!(req as RequestWithFlags).isBot,
});

const rateLimitPerIpMiddleware = rateLimit({
  windowMs: RATE_LIMIT_PER_IP_WINDOW_MS,
  max: RATE_LIMIT_PER_IP_MAX,
  message: {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Maximum ${RATE_LIMIT_PER_IP_MAX} aggregate requests per 15 minutes allowed per IP address.`,
    statusCode: 429,
  },
  standardHeaders: false,
  legacyHeaders: false,
  store: rateLimitStorePerIp,
  keyGenerator: generateIpKey,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    trackRateLimitExceeded(ip, userAgent);
    logger.warn('Rate limit exceeded (per-IP aggregate)', { ip, userAgent, path: req.path });
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_PER_IP_MAX} aggregate requests per 15 minutes allowed per IP address.`,
      statusCode: 429,
    });
  },
  skip: skipHealth,
});

/**
 * Full rate limit stack: bot tier, anonymous tier, then per-IP aggregate cap.
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  rateLimitBotClientMiddleware(req, res, () => {
    rateLimitAnonymousClientMiddleware(req, res, () => {
      rateLimitPerIpMiddleware(req, res, next);
    });
  });
}
