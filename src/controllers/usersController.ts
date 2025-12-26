/**
 * Users controller
 * Handles HTTP requests for users endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

/**
 * @swagger
 * /api/v1/users/{user_id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: OSM user ID
 *     responses:
 *       200:
 *         description: User profile with analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid user ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
