/**
 * Structured logging utility using Winston
 * Placeholder implementation - will be fully implemented in Task 2.2
 */

import winston from 'winston';

/**
 * Logger instance
 * Full configuration will be added in Task 2.2
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'osm-notes-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});
