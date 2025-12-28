/**
 * Countries routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as countriesController from '../controllers/countriesController';
import * as countryRankingsController from '../controllers/countryRankingsController';
import { validateCountryRankings } from '../middleware/validation';
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
 * @route   GET /api/v1/countries/rankings
 * @desc    Get country rankings by metric
 * @access  Public
 */
router.get(
  '/rankings',
  validateCountryRankings,
  cacheHandler(cacheMiddleware({ ttl: 300 })),
  asyncHandler(countryRankingsController.getCountryRankings)
);

/**
 * @route   GET /api/v1/countries/:country_id
 * @desc    Get country profile by ID
 * @access  Public
 */
router.get(
  '/:country_id',
  cacheHandler(cacheMiddleware({ ttl: 300 })),
  asyncHandler(countriesController.getCountryProfile)
);

export default router;
