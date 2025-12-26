/**
 * Countries routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as countriesController from '../controllers/countriesController';

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
 * @route   GET /api/v1/countries/:country_id
 * @desc    Get country profile by ID
 * @access  Public
 */
router.get('/:country_id', asyncHandler(countriesController.getCountryProfile));

export default router;
