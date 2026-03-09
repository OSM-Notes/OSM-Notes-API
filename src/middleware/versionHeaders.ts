/**
 * Middleware to add API version headers to every response.
 * Allows clients and ops to check deployed version without calling a specific endpoint.
 */

import { Request, Response, NextFunction } from 'express';
import { getPackageVersion } from '../config/app';

let cached: { name: string; version: string } | null = null;

function getVersion(): { name: string; version: string } {
  if (!cached) {
    cached = getPackageVersion();
  }
  return cached;
}

/**
 * Sets X-API-Version and X-API-Name on all responses.
 */
export function versionHeaders(_req: Request, res: Response, next: NextFunction): void {
  const { name, version } = getVersion();
  res.setHeader('X-API-Version', version);
  res.setHeader('X-API-Name', name);
  next();
}
