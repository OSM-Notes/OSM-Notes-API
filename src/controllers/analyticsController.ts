/**
 * Analytics controller
 * Handles HTTP requests for analytics endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analyticsService';
import { logger } from '../utils/logger';

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
