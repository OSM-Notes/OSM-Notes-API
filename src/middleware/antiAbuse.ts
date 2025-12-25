/**
 * Anti-abuse middleware
 * Detects and blocks AI agents without OAuth and applies restrictive rate limiting to known bots
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from './errorHandler';

/**
 * Known AI User-Agent patterns
 * These require OAuth authentication to access the API
 */
const AI_PATTERNS = [
  /chatgpt/i,
  /gpt-4/i,
  /gpt-3/i,
  /claude/i,
  /anthropic/i,
  /google.*bard/i,
  /copilot/i,
  /github.*copilot/i,
  /openai/i,
  /perplexity/i,
  /you\.com/i,
  /bing.*chat/i,
  /chatgpt.*api/i,
  /openai.*api/i,
];

/**
 * Known bot User-Agent patterns
 * These will have very restrictive rate limiting (10 req/hour)
 */
const BOT_PATTERNS = [
  /^curl\//i,
  /^wget\//i,
  /python-requests/i,
  /^go-http-client/i,
  /^java\/\d/i,
  /^scrapy/i,
  /^node-fetch/i,
  /^axios/i,
  /^httpie/i,
  /^postman/i,
];

/**
 * Check if User-Agent matches AI patterns
 */
function isAI(userAgent: string): boolean {
  return AI_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Check if User-Agent matches bot patterns
 */
function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Check if request is authenticated (has OAuth user)
 */
function isAuthenticated(req: Request): boolean {
  return !!(req as Request & { user?: { id: number } }).user;
}

/**
 * Anti-abuse middleware
 * - Blocks AI agents without OAuth (403)
 * - Applies restrictive rate limiting to known bots
 * - Logs all detected AIs and bots
 */
export function antiAbuseMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.get('User-Agent') || '';

  // Check for AI agents
  if (isAI(userAgent)) {
    if (!isAuthenticated(req)) {
      logger.warn('AI agent detected without OAuth', {
        ip: req.ip,
        userAgent,
        path: req.path,
      });

      const error = new ApiError(
        403,
        'AI agents require OAuth authentication. Please authenticate using OpenStreetMap OAuth to access this API.'
      );
      res.status(error.statusCode).json({
        error: 'Forbidden',
        message: error.message,
        statusCode: error.statusCode,
      });
      return;
    }

    // AI with OAuth is allowed
    logger.info('AI agent authenticated', {
      ip: req.ip,
      userAgent,
      userId: (req as Request & { user?: { id: number } }).user?.id,
    });
  }

  // Check for known bots
  if (isBot(userAgent)) {
    logger.info('Known bot detected', {
      ip: req.ip,
      userAgent,
      path: req.path,
    });

    // Attach bot flag to request for rate limiting middleware
    (req as Request & { isBot?: boolean }).isBot = true;
  }

  next();
}
