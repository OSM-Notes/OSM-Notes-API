/**
 * Users controller
 * Handles HTTP requests for users endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { setPaginationHeaders } from '../utils/pagination';
import { getAppConfig } from '../config/app';
import { OSM_ATTRIBUTION } from '../constants/attribution';

/**
 * @swagger
 * /notes-api/v1/users/{user_id}:
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
      attribution: OSM_ATTRIBUTION,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /notes-api/v1/users:
 *   get:
 *     summary: List all users with pagination
 *     tags: [Users]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [user_id, username, history_whole_open, history_whole_closed, resolution_rate]
 *           default: user_id
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         headers:
 *           X-Total-Count:
 *             description: Total number of users
 *             schema:
 *               type: integer
 *           X-Page:
 *             description: Current page number
 *             schema:
 *               type: integer
 *           X-Per-Page:
 *             description: Items per page
 *             schema:
 *               type: integer
 *           X-Total-Pages:
 *             description: Total number of pages
 *             schema:
 *               type: integer
 *           Link:
 *             description: Pagination links (RFC 5988)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserProfile'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const sort = (req.query.sort as string) || 'user_id';
    const order = (req.query.order as string) || 'desc';

    logger.debug('Listing users', { page, limit, sort, order });

    type UserSortField =
      | 'user_id'
      | 'username'
      | 'history_whole_open'
      | 'history_whole_closed'
      | 'resolution_rate';

    const result = await userService.listUsers({
      page,
      limit,
      sort: sort as UserSortField,
      order: order as 'asc' | 'desc',
    });

    const config = getAppConfig();
    const baseUrl = `/notes-api/${config.apiVersion}/users`;

    setPaginationHeaders(res, result.pagination, baseUrl, { sort, order });

    res.json({
      data: result.data,
      pagination: result.pagination,
      attribution: OSM_ATTRIBUTION,
    });
  } catch (error) {
    next(error);
  }
}
