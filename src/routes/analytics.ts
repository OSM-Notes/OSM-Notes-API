/**
 * Analytics routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { cacheMiddleware } from '../middleware/cache';
import { validateUserAgent } from '../middleware/validateUserAgent';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { requestLogger } from '../middleware/requestLogger';
import { metricsMiddleware } from '../middleware/metrics';

const router = Router();

/**
 * Async wrapper for route handlers
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Async wrapper for cache middleware
 */
function cacheHandler(
  middleware: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(middleware(req, res, next)).catch(next);
  };
}

/**
 * @route   GET /api/v1/analytics/global
 * @desc    Get global analytics
 * @access  Public
 */
router.get(
  '/global',
  validateUserAgent,
  rateLimitMiddleware,
  requestLogger,
  metricsMiddleware,
  cacheHandler(cacheMiddleware({ ttl: 600 })),
  asyncHandler(analyticsController.getGlobalAnalytics)
);

/**
 * @route   GET /api/v1/analytics/comparison
 * @desc    Compare users or countries by their metrics
 * @access  Public
 */
router.get(
  '/comparison',
  validateUserAgent,
  rateLimitMiddleware,
  requestLogger,
  metricsMiddleware,
  cacheHandler(cacheMiddleware({ ttl: 300 })),
  asyncHandler(analyticsController.getComparison)
);

/**
 * @route   GET /api/v1/analytics/trends
 * @desc    Get temporal trends for users, countries, or global
 * @access  Public
 */
router.get(
  '/trends',
  validateUserAgent,
  rateLimitMiddleware,
  requestLogger,
  metricsMiddleware,
  cacheHandler(cacheMiddleware({ ttl: 600 })),
  asyncHandler(analyticsController.getTrends)
);

export default router;
