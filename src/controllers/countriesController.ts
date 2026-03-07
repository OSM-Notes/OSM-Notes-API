/**
 * Countries controller
 * Handles HTTP requests for countries endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as countryService from '../services/countryService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { setPaginationHeaders } from '../utils/pagination';
import { getAppConfig } from '../config/app';

/**
 * @swagger
 * /notes-api/v1/countries/{country_id}:
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

/**
 * @swagger
 * /notes-api/v1/countries:
 *   get:
 *     summary: List all countries with pagination
 *     tags: [Countries]
 *     security:
 *       - UserAgent: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [country_id, country_name, history_whole_open, history_whole_closed, resolution_rate]
 *           default: country_name
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated list of countries
 *         headers:
 *           X-Total-Count:
 *             description: Total number of countries
 *             schema:
 *               type: integer
 *           X-Page:
 *             description: Current page number
 *             schema:
 *               type: integer
 *           X-Per-Page:
 *             description: Items per page
 *             schema:
 *               type: integer
 *           X-Total-Pages:
 *             description: Total number of pages
 *             schema:
 *               type: integer
 *           Link:
 *             description: Pagination links (RFC 5988)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CountryProfile'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function listCountries(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const sort = (req.query.sort as string) || 'country_name';
    const order = (req.query.order as string) || 'asc';

    logger.debug('Listing countries', { page, limit, sort, order });

    type CountrySortField =
      | 'country_id'
      | 'country_name'
      | 'history_whole_open'
      | 'history_whole_closed'
      | 'resolution_rate';

    const result = await countryService.listCountries({
      page,
      limit,
      sort: sort as CountrySortField,
      order: order as 'asc' | 'desc',
    });

    const config = getAppConfig();
    const baseUrl = `/notes-api/${config.apiVersion}/countries`;

    setPaginationHeaders(res, result.pagination, baseUrl, { sort, order });

    res.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
