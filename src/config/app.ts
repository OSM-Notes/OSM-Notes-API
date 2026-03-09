/**
 * Application configuration
 */

import path from 'path';
import fs from 'fs';

export interface AppConfig {
  port: number;
  env: string;
  apiVersion: string;
  corsOrigin: string | string[];
}

export interface PackageVersion {
  name: string;
  version: string;
}

/**
 * Read name and version from package.json at startup (for X-API-Version header).
 * Uses project root package.json (works when running from dist/).
 */
export function getPackageVersion(): PackageVersion {
  const fallback: PackageVersion = {
    name: 'osm-notes-api',
    version: process.env.npm_package_version || process.env.APP_VERSION || '0.0.0',
  };
  try {
    // From dist/config/app.js, project root is ../..
    const packagePath = path.join(__dirname, '..', '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as {
        name?: string;
        version?: string;
      };
      return {
        name: typeof pkg.name === 'string' ? pkg.name : fallback.name,
        version: typeof pkg.version === 'string' ? pkg.version : fallback.version,
      };
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Get application configuration from environment variables
 */
export function getAppConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  };
}
