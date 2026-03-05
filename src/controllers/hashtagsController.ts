/**
 * Hashtags controller
 * Handles HTTP requests for hashtags endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as hashtagService from '../services/hashtagService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { HashtagListParams } from '../types';
import { setPaginationHeaders } from '../utils/pagination';

/**
 * @swagger
 * /notes-api/v1/hashtags:
 *   get:
 *     summary: Get list of hashtags with usage counts
 *     tags: [Hashtags]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Results per page
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (by count)
 *     responses:
 *       200:
 *         description: List of hashtags with counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hashtag:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Invalid parameters
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
export async function getHashtags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const getQueryString = (value: unknown): string | undefined => {
      if (!value) return undefined;
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
      if (Array.isArray(value) && typeof value[0] === 'number') return String(value[0]);
      return undefined;
    };

    const pageStr = getQueryString(req.query.page);
    const limitStr = getQueryString(req.query.limit);
    const orderStr = getQueryString(req.query.order);

    const params: HashtagListParams = {
      page: pageStr ? parseInt(pageStr, 10) : undefined,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
      order: orderStr as 'asc' | 'desc' | undefined,
    };

    // Validate order parameter
    if (params.order && params.order !== 'asc' && params.order !== 'desc') {
      throw new ApiError(400, 'Invalid order parameter. Must be "asc" or "desc"');
    }

    logger.debug('Getting hashtags list', { params });

    const result = await hashtagService.getHashtags(params);

    // Set pagination headers
    const queryParams: Record<string, string | number | undefined> = {};
    if (pageStr) queryParams.page = pageStr;
    if (limitStr) queryParams.limit = limitStr;
    if (orderStr) queryParams.order = orderStr;

    setPaginationHeaders(res, result.pagination, '/notes-api/v1/hashtags', queryParams);

    res.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /notes-api/v1/hashtags/{hashtag}:
 *   get:
 *     summary: Get details for a specific hashtag
 *     tags: [Hashtags]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: path
 *         name: hashtag
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashtag name (without #)
 *     responses:
 *       200:
 *         description: Hashtag details with users and countries using it
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hashtag:
 *                   type: string
 *                 users_count:
 *                   type: integer
 *                 countries_count:
 *                   type: integer
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       history_whole_open:
 *                         type: integer
 *                       history_whole_closed:
 *                         type: integer
 *                 countries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       country_id:
 *                         type: integer
 *                       country_name:
 *                         type: string
 *                       history_whole_open:
 *                         type: integer
 *                       history_whole_closed:
 *                         type: integer
 *       400:
 *         description: Invalid hashtag parameter
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
export async function getHashtagDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hashtag = req.params.hashtag;

    if (!hashtag || hashtag.trim().length === 0) {
      throw new ApiError(400, 'Hashtag parameter is required');
    }

    // Remove # if present
    const cleanHashtag = hashtag.trim().replace(/^#/, '');

    if (cleanHashtag.length === 0) {
      throw new ApiError(400, 'Invalid hashtag');
    }

    logger.debug('Getting hashtag details', { hashtag: cleanHashtag });

    const result = await hashtagService.getHashtagDetails(cleanHashtag);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
