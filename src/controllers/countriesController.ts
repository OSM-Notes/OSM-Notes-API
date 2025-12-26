/**
 * Countries controller
 * Handles HTTP requests for countries endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as countryService from '../services/countryService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

/**
 * @swagger
 * /api/v1/countries/{country_id}:
 *   get:
 *     summary: Get country profile by ID
 *     tags: [Countries]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: path
 *         name: country_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Country profile with analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CountryProfile'
 *       400:
 *         description: Invalid country ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Country not found
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
