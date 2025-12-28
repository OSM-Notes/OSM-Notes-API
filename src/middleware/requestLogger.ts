/**
 * Request logging middleware
 * Enhanced logging with request ID, performance metrics, and structured context
 *
 * @module middleware/requestLogger
 * @description
 * This middleware provides enhanced request/response logging with:
 * - Unique request ID for tracing
 * - Request/response logging with context
 * - Performance metrics (response time)
 * - Structured logging with User-Agent info
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Extend Express Request to include request ID
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Request logging middleware
 * Logs incoming requests with context and tracks response time
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Extract User-Agent info if available
  const userAgent = req.get('User-Agent') || 'unknown';
  const userAgentInfo = (
    req as Request & { userAgentInfo?: { appName?: string; version?: string; contact?: string } }
  ).userAgentInfo;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent,
    userAgentInfo: userAgentInfo || undefined,
    headers: {
      'content-type': req.get('content-type'),
      'content-length': req.get('content-length'),
    },
  });

  // Track response finish
  res.on('finish', () => {
    const responseTime = req.startTime ? Date.now() - req.startTime : undefined;

    // Determine log level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    // Log response
    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      responseTimeMs: responseTime,
      ip: req.ip,
      userAgent,
      userAgentInfo: userAgentInfo || undefined,
      cacheStatus: res.getHeader('X-Cache') || undefined,
      rateLimitRemaining: res.getHeader('RateLimit-Remaining') || undefined,
    });

    // Log slow requests (warnings for requests > 1 second)
    if (responseTime && responseTime > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        path: req.path,
        responseTime: `${responseTime}ms`,
        responseTimeMs: responseTime,
        threshold: '1000ms',
      });
    }
  });

  // Track response close (client disconnected)
  res.on('close', () => {
    if (!res.writableEnded) {
      const responseTime = req.startTime ? Date.now() - req.startTime : undefined;
      logger.warn('Request closed before completion', {
        requestId,
        method: req.method,
        path: req.path,
        responseTime: responseTime ? `${responseTime}ms` : undefined,
        responseTimeMs: responseTime,
        ip: req.ip,
        userAgent,
      });
    }
  });

  next();
}

/**
 * Get request ID from request object
 * @param req Express request object
 * @returns Request ID or undefined
 */
export function getRequestId(req: Request): string | undefined {
  return req.requestId;
}
