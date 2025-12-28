/**
 * Analytics controller
 * Handles HTTP requests for analytics endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analyticsService';
import * as comparisonService from '../services/comparisonService';
import * as trendsService from '../services/trendsService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { TrendsResult } from '../types';

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

/**
 * @swagger
 * /api/v1/analytics/trends:
 *   get:
 *     summary: Get temporal trends for users, countries, or global analytics
 *     tags: [Analytics]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [users, countries, global]
 *           required: true
 *         description: Type of entity to get trends for
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: User ID (required if type is 'users')
 *       - in: query
 *         name: country_id
 *         schema:
 *           type: integer
 *         description: Country ID (required if type is 'countries')
 *     responses:
 *       200:
 *         description: Trends data with temporal analysis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendsResult'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Entity not found
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
export async function getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, user_id, country_id } = req.query;

    if (!type || (type !== 'users' && type !== 'countries' && type !== 'global')) {
      throw new ApiError(
        400,
        'Invalid or missing "type" parameter. Must be "users", "countries", or "global".'
      );
    }

    const params: {
      type: 'users' | 'countries' | 'global';
      user_id?: number;
      country_id?: number;
    } = {
      type: type as 'users' | 'countries' | 'global',
    };

    if (type === 'users') {
      if (!user_id) {
        throw new ApiError(400, 'Missing "user_id" parameter for user trends.');
      }
      const userId = parseInt(String(user_id), 10);
      if (isNaN(userId)) {
        throw new ApiError(400, 'Invalid "user_id" parameter. Must be a valid number.');
      }
      params.user_id = userId;
    }

    if (type === 'countries') {
      if (!country_id) {
        throw new ApiError(400, 'Missing "country_id" parameter for country trends.');
      }
      const countryId = parseInt(String(country_id), 10);
      if (isNaN(countryId)) {
        throw new ApiError(400, 'Invalid "country_id" parameter. Must be a valid number.');
      }
      params.country_id = countryId;
    }

    logger.debug('Fetching trends', { params });

    const result: TrendsResult = await trendsService.getTrends(params);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
