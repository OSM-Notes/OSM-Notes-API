/**
 * OSM Notes API
 * Main entry point for the application
 */

import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { validateEnv } from './config/env';
import { getAppConfig } from './config/app';
import { errorHandler, notFoundHandler, ApiError } from './middleware/errorHandler';
import { logger } from './utils/logger';
import routes from './routes';

/**
 * Create and configure Express application
 */
function createApp(): Express {
  const app = express();
  const config = getAppConfig();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Handle JSON parsing errors
  app.use(
    (
      err: Error & { status?: number; type?: string },
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
        const apiError = new ApiError(400, 'Invalid JSON in request body');
        return errorHandler(apiError, req, res, next);
      }
      next(err);
    }
  );

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  // Routes
  app.use('/', routes);

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
function startServer(): void {
  // Validate environment variables on startup (only when starting server)
  try {
    validateEnv();
  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  const app = createApp();
  const config = getAppConfig();

  const server = app.listen(config.port, () => {
    logger.info('Server started', {
      port: config.port,
      env: config.env,
      apiVersion: config.apiVersion,
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export app factory for testing
export default createApp;
