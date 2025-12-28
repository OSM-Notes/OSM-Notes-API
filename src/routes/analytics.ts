/**
 * Analytics routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { cacheMiddleware } from '../middleware/cache';

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
  cacheHandler(cacheMiddleware({ ttl: 600 })),
  asyncHandler(analyticsController.getGlobalAnalytics)
);

export default router;
