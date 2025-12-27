/**
 * Search controller
 * Handles HTTP requests for search operations
 */

import { Request, Response, NextFunction } from 'express';
import * as searchService from '../services/searchService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * @swagger
 * /api/v1/search/users:
 *   get:
 *     summary: Search users by username or user_id
 *     tags: [Search]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (username pattern or user_id)
 *     responses:
 *       200:
 *         description: Search results
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
 *                       user_id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       history_whole_open:
 *                         type: integer
 *                       history_whole_closed:
 *                         type: integer
 *       400:
 *         description: Invalid query parameter
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
export async function searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query.q as string | undefined;

    if (!query || query.trim().length === 0) {
      throw new ApiError(400, 'Query parameter "q" is required');
    }

    logger.debug('Searching users', { query });

    const results = await searchService.searchUsers(query.trim());

    res.json({
      data: results,
      count: results.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/search/countries:
 *   get:
 *     summary: Search countries by name, ISO code, or country_id
 *     tags: [Search]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (country name pattern, ISO code, or country_id)
 *     responses:
 *       200:
 *         description: Search results
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
 *                       country_id:
 *                         type: integer
 *                       country_name:
 *                         type: string
 *                       country_name_en:
 *                         type: string
 *                       country_name_es:
 *                         type: string
 *                       iso_alpha2:
 *                         type: string
 *                       history_whole_open:
 *                         type: integer
 *                       history_whole_closed:
 *                         type: integer
 *       400:
 *         description: Invalid query parameter
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
export async function searchCountries(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query.q as string | undefined;

    if (!query || query.trim().length === 0) {
      throw new ApiError(400, 'Query parameter "q" is required');
    }

    logger.debug('Searching countries', { query });

    const results = await searchService.searchCountries(query.trim());

    res.json({
      data: results,
      count: results.length,
    });
  } catch (error) {
    next(error);
  }
}
