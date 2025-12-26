/**
 * Analytics controller
 * Handles HTTP requests for analytics endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analyticsService';
import { logger } from '../utils/logger';

/**
 * Get global analytics
 * GET /api/v1/analytics/global
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
