/**
 * Environment variable validation and configuration
 */

import Joi from 'joi';
import { logger } from '../utils/logger';

/**
 * Environment variable schema
 */
const envSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_VERSION: Joi.string().default('v1'),
  CORS_ORIGIN: Joi.string().default('*'),

  // Database
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_SSL: Joi.string().valid('true', 'false').default('false'),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.string().valid('true', 'false').default('true'),
  DB_MAX_CONNECTIONS: Joi.number().integer().min(1).max(100).default(20),
  DB_IDLE_TIMEOUT: Joi.number().integer().min(1000).default(30000),
  DB_CONNECTION_TIMEOUT: Joi.number().integer().min(1000).default(10000),

  // Redis
  REDIS_HOST: Joi.string().allow('').default('localhost'),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().integer().min(0).max(15).default(0),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose', 'silly')
    .default('info'),

  // OAuth (Phase 5 - optional for now)
  OSM_OAUTH_CLIENT_ID: Joi.string().allow('').optional(),
  OSM_OAUTH_CLIENT_SECRET: Joi.string().allow('').optional(),
  OAUTH_CALLBACK_URL: Joi.string().uri().allow('').optional(),
})
  .unknown()
  .required();

/**
 * Validated environment variables
 */
export interface ValidatedEnv {
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_VERSION: string;
  CORS_ORIGIN: string;

  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: 'true' | 'false';
  DB_SSL_REJECT_UNAUTHORIZED: 'true' | 'false';
  DB_MAX_CONNECTIONS: number;
  DB_IDLE_TIMEOUT: number;
  DB_CONNECTION_TIMEOUT: number;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly';

  // OAuth
  OSM_OAUTH_CLIENT_ID?: string;
  OSM_OAUTH_CLIENT_SECRET?: string;
  OAUTH_CALLBACK_URL?: string;
}

let validatedEnv: ValidatedEnv | null = null;

/**
 * Validate and load environment variables
 * @throws Error if validation fails
 */
export function validateEnv(): ValidatedEnv {
  if (validatedEnv) {
    return validatedEnv;
  }

  const validationResult = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: true,
  });
  const error = validationResult.error;
  const value = validationResult.value as unknown as ValidatedEnv;

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join('\n');
    logger.error('Environment variable validation failed', {
      errors: errorMessages,
      details: error.details,
    });
    throw new Error(`Environment variable validation failed:\n${errorMessages}`);
  }

  // Joi already converts numbers, but TypeScript needs explicit typing
  const validatedValue = value as unknown as ValidatedEnv;
  const env: ValidatedEnv = {
    ...validatedValue,
  };

  validatedEnv = env;

  logger.info('Environment variables validated successfully', {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    dbHost: env.DB_HOST,
    dbName: env.DB_NAME,
  });

  return env;
}

/**
 * Get validated environment variables
 * Validates on first call, then returns cached result
 */
export function getEnv(): ValidatedEnv {
  return validateEnv();
}

/**
 * Reset validated environment (useful for testing)
 */
export function resetEnv(): void {
  validatedEnv = null;
}
