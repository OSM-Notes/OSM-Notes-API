/**
 * User rankings controller
 * Handles HTTP requests for user rankings endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as userRankingsService from '../services/userRankingsService';
import { logger } from '../utils/logger';
import { UserRankingsParams, UserRankingMetric } from '../types';

/**
 * @swagger
 * /api/v1/users/rankings:
 *   get:
 *     summary: Get user rankings by metric
 *     tags: [Users]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         required: true
 *         schema:
 *           type: string
 *           enum: [history_whole_open, history_whole_closed, history_whole_commented, resolution_rate, avg_days_to_resolution]
 *         description: Metric to rank by
 *       - in: query
 *         name: country
 *         schema:
 *           type: integer
 *         description: Filter by country ID (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User rankings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metric:
 *                   type: string
 *                 country:
 *                   type: integer
 *                 order:
 *                   type: string
 *                 rankings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       value:
 *                         type: number
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
export async function getUserRankings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Parameters are already validated by validateUserRankings middleware
    const metric = req.query.metric as string;
    const country = req.query.country ? parseInt(String(req.query.country), 10) : undefined;
    const limit = parseInt(String(req.query.limit || '10'), 10);
    const order = (req.query.order as 'asc' | 'desc') || 'desc';

    const params: UserRankingsParams = {
      metric: metric as UserRankingMetric,
      limit,
      order,
    };

    if (country !== undefined) {
      params.country = country;
    }

    logger.debug('Getting user rankings', { metric, country, limit, order });

    const result = await userRankingsService.getUserRankings(params);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
