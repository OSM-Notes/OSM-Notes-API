/**
 * Search routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as searchController from '../controllers/searchController';

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
 * @route   GET /api/v1/search/users
 * @desc    Search users by username or user_id
 * @access  Public
 */
router.get('/users', asyncHandler(searchController.searchUsers));

/**
 * @route   GET /api/v1/search/countries
 * @desc    Search countries by name, ISO code, or country_id
 * @access  Public
 */
router.get('/countries', asyncHandler(searchController.searchCountries));

export default router;
