/**
 * Application configuration
 */

export interface AppConfig {
  port: number;
  env: string;
  apiVersion: string;
  corsOrigin: string | string[];
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
