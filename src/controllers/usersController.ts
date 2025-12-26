/**
 * Users controller
 * Handles HTTP requests for users endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

/**
 * Get user profile by ID
 * GET /api/v1/users/:user_id
 */
export async function getUserProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = parseInt(req.params.user_id, 10);

    if (isNaN(userId) || userId <= 0) {
      throw new ApiError(400, 'Invalid user ID');
    }

    logger.debug('Getting user profile by ID', { userId });

    const userProfile = await userService.getUserProfile(userId);

    res.json({
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
}
