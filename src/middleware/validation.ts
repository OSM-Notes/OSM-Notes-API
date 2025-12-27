/**
 * Validation middleware and schemas
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

/**
 * Schema for validating search filters
 */
export const searchFiltersSchema = Joi.object({
  country: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('open', 'closed', 'reopened').optional(),
  hashtag: Joi.string().min(1).max(100).optional(),
  date_from: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .message('date_from must be in YYYY-MM-DD format')
    .optional(),
  date_to: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .message('date_to must be in YYYY-MM-DD format')
    .optional(),
  user_id: Joi.number().integer().positive().optional(),
  application: Joi.string().min(1).max(100).optional(),
  bbox: Joi.string()
    .pattern(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/)
    .message('bbox must be in format: min_lon,min_lat,max_lon,max_lat')
    .optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
}).custom((value, helpers) => {
  // Validate date range: date_from should be before date_to
  const typedValue = value as {
    date_from?: string;
    date_to?: string;
    [key: string]: unknown;
  };
  if (typedValue.date_from && typedValue.date_to) {
    const fromDate = new Date(typedValue.date_from);
    const toDate = new Date(typedValue.date_to);
    if (fromDate > toDate) {
      return helpers.error('any.custom', {
        message: 'date_from must be before or equal to date_to',
      });
    }
  }
  return typedValue;
});

/**
 * Middleware to validate search filters
 */
export function validateSearchFilters(req: Request, _res: Response, next: NextFunction): void {
  const validationResult = searchFiltersSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });
  const error = validationResult.error;
  const value = validationResult.value as Record<string, unknown>;

  if (error) {
    const messages = error.details.map((detail) => detail.message).join(', ');
    throw new ApiError(400, `Invalid filters: ${messages}`);
  }

  // Replace query with validated values (convert to strings for Express compatibility)
  const validatedQuery: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) {
      validatedQuery[key] = String(val);
    }
  }
  req.query = validatedQuery as typeof req.query;

  next();
}
