/**
 * Country rankings controller
 * Handles HTTP requests for country rankings endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as countryRankingsService from '../services/countryRankingsService';
import { logger } from '../utils/logger';
import { CountryRankingsParams, CountryRankingMetric } from '../types';

/**
 * @swagger
 * /api/v1/countries/rankings:
 *   get:
 *     summary: Get country rankings by metric
 *     tags: [Countries]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         required: true
 *         schema:
 *           type: string
 *           enum: [history_whole_open, history_whole_closed, resolution_rate, avg_days_to_resolution, notes_health_score]
 *         description: Metric to rank by
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
 *         description: Country rankings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metric:
 *                   type: string
 *                 order:
 *                   type: string
 *                 rankings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: integer
 *                       country_id:
 *                         type: integer
 *                       country_name:
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
export async function getCountryRankings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Parameters are already validated by validateCountryRankings middleware
    const metric = req.query.metric as string;
    const limit = parseInt(String(req.query.limit || '10'), 10);
    const order = (req.query.order as 'asc' | 'desc') || 'desc';

    const params: CountryRankingsParams = {
      metric: metric as CountryRankingMetric,
      limit,
      order,
    };

    logger.debug('Getting country rankings', { metric, limit, order });

    const result = await countryRankingsService.getCountryRankings(params);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
