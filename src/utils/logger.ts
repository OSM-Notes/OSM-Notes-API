/**
 * Structured logging utility using Winston
 */

import winston from 'winston';

/**
 * Log levels configuration
 */
const logLevel =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Log format for development (human-readable)
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${String(timestamp)} [${String(level)}]: ${String(message)} ${metaString}`;
  })
);

/**
 * Log format for production (JSON structured)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'osm-notes-api',
  },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
    // File transport for errors (production only)
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Create a child logger with additional metadata
 * @param meta Additional metadata to include in all logs
 * @returns Child logger instance
 */
export function createChildLogger(meta: Record<string, unknown>): winston.Logger {
  return logger.child(meta);
}

/**
 * Stream interface for Morgan HTTP logger
 */
export const loggerStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};
