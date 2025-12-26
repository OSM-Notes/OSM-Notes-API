/**
 * Countries controller
 * Handles HTTP requests for countries endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as countryService from '../services/countryService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

/**
 * Get country profile by ID
 * GET /api/v1/countries/:country_id
 */
export async function getCountryProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const countryId = parseInt(req.params.country_id, 10);

    if (isNaN(countryId) || countryId <= 0) {
      throw new ApiError(400, 'Invalid country ID');
    }

    logger.debug('Getting country profile by ID', { countryId });

    const countryProfile = await countryService.getCountryProfile(countryId);

    res.json({
      data: countryProfile,
    });
  } catch (error) {
    next(error);
  }
}
