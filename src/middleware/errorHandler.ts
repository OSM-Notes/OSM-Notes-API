/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Handles all errors and sends appropriate responses
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Get request ID if available
  const requestId = (req as Request & { requestId?: string }).requestId;

  // Log error
  logger.error('Error occurred', {
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: err instanceof ApiError ? err.statusCode : 500,
  });

  // Handle known API errors
  if (err instanceof ApiError && err.isOperational) {
    res.status(err.statusCode).json({
      error: getErrorName(err.statusCode),
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  // Handle unknown errors
  const statusCode = (err as ApiError).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: getErrorName(statusCode),
    message,
    statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new ApiError(404, `Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Get error name from status code
 */
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return errorNames[statusCode] || 'Error';
}
