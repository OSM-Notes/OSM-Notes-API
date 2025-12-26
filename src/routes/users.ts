/**
 * Users routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as usersController from '../controllers/usersController';

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
 * @route   GET /api/v1/users/:user_id
 * @desc    Get user profile by ID
 * @access  Public
 */
router.get('/:user_id', asyncHandler(usersController.getUserProfile));

export default router;
