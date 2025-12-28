/**
 * Analytics controller
 * Handles HTTP requests for analytics endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analyticsService';
import * as comparisonService from '../services/comparisonService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

/**
 * @swagger
 * /api/v1/analytics/global:
 *   get:
 *     summary: Get global analytics and statistics
 *     tags: [Analytics]
 *     security:
 *       - UserAgent: []
 *     responses:
 *       200:
 *         description: Global analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GlobalAnalytics'
 *       404:
 *         description: Global analytics not found
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
export async function getGlobalAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.debug('Getting global analytics');

    const globalAnalytics = await analyticsService.getGlobalAnalytics();

    res.json({
      data: globalAnalytics,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/analytics/comparison:
 *   get:
 *     summary: Compare users or countries by their metrics
 *     tags: [Analytics]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [users, countries]
 *         description: Type of entities to compare
 *       - in: query
 *         name: ids
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of IDs to compare (max 10)
 *     responses:
 *       200:
 *         description: Comparison result with metrics for each entity
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: users
 *                     entities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           user_id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           history_whole_open:
 *                             type: integer
 *                           history_whole_closed:
 *                             type: integer
 *                           history_whole_commented:
 *                             type: integer
 *                           avg_days_to_resolution:
 *                             type: number
 *                           resolution_rate:
 *                             type: number
 *                           user_response_time:
 *                             type: number
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: countries
 *                     entities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country_id:
 *                             type: integer
 *                           country_name:
 *                             type: string
 *                           history_whole_open:
 *                             type: integer
 *                           history_whole_closed:
 *                             type: integer
 *                           avg_days_to_resolution:
 *                             type: number
 *                           resolution_rate:
 *                             type: number
 *                           notes_health_score:
 *                             type: number
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
export async function getComparison(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const type = req.query.type as string | undefined;
    const idsParam = req.query.ids as string | undefined;

    // Validate type parameter
    if (!type || (type !== 'users' && type !== 'countries')) {
      throw new ApiError(400, 'Parameter "type" is required and must be "users" or "countries"');
    }

    // Validate ids parameter
    if (!idsParam || idsParam.trim().length === 0) {
      throw new ApiError(400, 'Parameter "ids" is required');
    }

    // Parse IDs from comma-separated string
    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .map((id) => {
        const parsed = parseInt(id, 10);
        if (isNaN(parsed) || parsed <= 0) {
          throw new ApiError(400, `Invalid ID: ${id}. IDs must be positive integers`);
        }
        return parsed;
      });

    if (ids.length === 0) {
      throw new ApiError(400, 'At least one valid ID is required');
    }

    if (ids.length > 10) {
      throw new ApiError(400, 'Maximum 10 IDs allowed for comparison');
    }

    logger.debug('Getting comparison', { type, ids });

    let result;
    if (type === 'users') {
      result = await comparisonService.compareUsers(ids);
    } else {
      result = await comparisonService.compareCountries(ids);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}
