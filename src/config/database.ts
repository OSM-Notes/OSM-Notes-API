/**
 * Database configuration and connection pool management
 */

import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  const password = process.env.DB_PASSWORD;
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'osm_notes_dwh',
    user: process.env.DB_USER || 'postgres',
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  };

  // Only set password if provided (omit if empty/undefined)
  if (password && password.length > 0) {
    config.password = password;
  }

  // SSL configuration
  if (process.env.DB_SSL === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
  } else {
    config.ssl = false;
  }

  return config;
}

/**
 * Get or create database connection pool
 * Returns singleton pool instance
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();

    logger.info('Creating database connection pool', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      max: config.max,
    });

    pool = new Pool(config as PoolConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected database pool error', {
        error: err.message,
        stack: err.stack,
      });
    });

    // Handle connection errors
    pool.on('connect', () => {
      logger.debug('New database connection established');
    });
  }

  return pool;
}

/**
 * Test database connection
 * @throws Error if connection fails
 */
export async function testConnection(): Promise<void> {
  const pool = getDatabasePool();

  try {
    const result = await pool.query('SELECT version()');
    const version = result.rows[0] as { version: string } | undefined;
    logger.info('Database connection test successful', {
      version: version?.version,
    });
  } catch (error) {
    logger.error('Database connection test failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      logger.info('Database connection pool closed');
      pool = null;
    } catch (error) {
      logger.error('Error closing database pool', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw, allow graceful shutdown even if close fails
    }
  }
}

/**
 * Reset database connection pool (for testing)
 * Closes existing pool and forces recreation on next getDatabasePool() call
 */
export async function resetDatabasePool(): Promise<void> {
  await closeDatabasePool();
}

/**
 * Get database pool statistics (for monitoring)
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  const currentPool = getDatabasePool();
  return {
    totalCount: currentPool.totalCount,
    idleCount: currentPool.idleCount,
    waitingCount: currentPool.waitingCount,
  };
}
