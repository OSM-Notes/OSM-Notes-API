/**
 * User-Agent validation middleware
 * Validates User-Agent header format: <AppName>/<Version> (<Contact>)
 * Contact must be a valid email or URL
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from './errorHandler';

/**
 * User-Agent information interface
 */
export interface UserAgentInfo {
  appName: string;
  version: string;
  contact: string;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate contact (email or URL)
 */
function isValidContact(contact: string): boolean {
  return isValidEmail(contact) || isValidUrl(contact);
}

/**
 * Parse User-Agent header
 * Expected format: <AppName>/<Version> (<Contact>)
 */
function parseUserAgent(userAgent: string): UserAgentInfo | null {
  // Pattern: AppName/Version (Contact)
  const pattern = /^([^/]+)\/([^\s]+)\s+\(([^)]+)\)$/;
  const match = userAgent.match(pattern);

  if (!match) {
    return null;
  }

  const [, appName, version, contact] = match;

  if (!isValidContact(contact)) {
    return null;
  }

  return {
    appName: appName.trim(),
    version: version.trim(),
    contact: contact.trim(),
  };
}

/**
 * User-Agent validation middleware
 * Validates User-Agent header format and extracts information
 */
export function validateUserAgent(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.get('User-Agent');

  if (!userAgent) {
    logger.warn('Request without User-Agent header', {
      ip: req.ip,
      path: req.path,
    });

    const error = new ApiError(
      400,
      'User-Agent header is required. Format: <AppName>/<Version> (<Contact>). Contact must be a valid email or URL.'
    );
    res.status(error.statusCode).json({
      error: 'Bad Request',
      message: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  const userAgentInfo = parseUserAgent(userAgent);

  if (!userAgentInfo) {
    logger.warn('Invalid User-Agent format', {
      ip: req.ip,
      path: req.path,
      userAgent,
    });

    const error = new ApiError(
      400,
      'Invalid User-Agent format. Expected: <AppName>/<Version> (<Contact>). Contact must be a valid email or URL.'
    );
    res.status(error.statusCode).json({
      error: 'Bad Request',
      message: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  // Attach parsed User-Agent info to request
  (req as Request & { userAgentInfo: UserAgentInfo }).userAgentInfo = userAgentInfo;

  logger.debug('User-Agent validated', {
    appName: userAgentInfo.appName,
    version: userAgentInfo.version,
    contact: userAgentInfo.contact,
    ip: req.ip,
  });

  next();
}
