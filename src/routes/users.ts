/**
 * Users routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as usersController from '../controllers/usersController';
import * as userRankingsController from '../controllers/userRankingsController';
import { validateUserRankings } from '../middleware/validation';
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
 * @route   GET /api/v1/users/rankings
 * @desc    Get user rankings by metric
 * @access  Public
 */
router.get(
  '/rankings',
  validateUserRankings,
  cacheHandler(cacheMiddleware({ ttl: 300 })),
  asyncHandler(userRankingsController.getUserRankings)
);

/**
 * @route   GET /api/v1/users/:user_id
 * @desc    Get user profile by ID
 * @access  Public
 */
router.get(
  '/:user_id',
  cacheHandler(cacheMiddleware({ ttl: 300 })),
  asyncHandler(usersController.getUserProfile)
);

export default router;
