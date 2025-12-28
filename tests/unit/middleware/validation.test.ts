/**
 * Unit tests for validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateSearchFilters,
  searchFiltersSchema,
  validateUserRankings,
  validateCountryRankings,
  userRankingsSchema,
  countryRankingsSchema,
} from '../../../src/middleware/validation';
import { ApiError } from '../../../src/middleware/errorHandler';

describe('validation middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      query: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('searchFiltersSchema', () => {
    it('should validate valid filters', () => {
      const validFilters = {
        country: 42,
        status: 'open',
        user_id: 12345,
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        page: 1,
        limit: 20,
      };

      const { error } = searchFiltersSchema.validate(validFilters);
      expect(error).toBeUndefined();
    });

    it('should reject invalid status', () => {
      const invalidFilters = {
        status: 'invalid_status',
      };

      const { error } = searchFiltersSchema.validate(invalidFilters);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be one of');
    });

    it('should reject invalid date format', () => {
      const invalidFilters = {
        date_from: '2024/01/01', // Wrong format
      };

      const { error } = searchFiltersSchema.validate(invalidFilters);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('YYYY-MM-DD');
    });

    it('should reject negative country', () => {
      const invalidFilters = {
        country: -1,
      };

      const { error } = searchFiltersSchema.validate(invalidFilters);
      expect(error).toBeDefined();
    });

    it('should reject invalid bbox format', () => {
      const invalidFilters = {
        bbox: '1,2,3', // Only 3 parts instead of 4
      };

      const { error } = searchFiltersSchema.validate(invalidFilters);
      expect(error).toBeDefined();
    });

    it('should reject date_from after date_to', () => {
      const invalidFilters = {
        date_from: '2024-01-31',
        date_to: '2024-01-01', // Before date_from
      };

      const { error } = searchFiltersSchema.validate(invalidFilters);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('custom validation');
    });

    it('should accept date_from equal to date_to', () => {
      const validFilters = {
        date_from: '2024-01-01',
        date_to: '2024-01-01',
      };

      const { error } = searchFiltersSchema.validate(validFilters);
      expect(error).toBeUndefined();
    });

    it('should reject limit greater than 100', () => {
      const invalidFilters = {
        limit: 101,
      };

      const { error } = searchFiltersSchema.validate(invalidFilters);
      expect(error).toBeDefined();
    });

    it('should reject page less than 1', () => {
      const invalidFilters = {
        page: 0,
      };

      const { error } = searchFiltersSchema.validate(invalidFilters);
      expect(error).toBeDefined();
    });

    it('should apply default values for page and limit', () => {
      const filters = {};

      const validationResult = searchFiltersSchema.validate(filters);
      const typedValue = validationResult.value as { page?: number; limit?: number };
      expect(typedValue.page).toBe(1);
      expect(typedValue.limit).toBe(20);
    });
  });

  describe('validateSearchFilters middleware', () => {
    it('should call next() when filters are valid', () => {
      mockRequest.query = {
        country: '42',
        status: 'open',
        page: '1',
        limit: '20',
      };

      validateSearchFilters(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw ApiError when filters are invalid', () => {
      mockRequest.query = {
        status: 'invalid_status',
      };

      expect(() => {
        validateSearchFilters(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(ApiError);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw ApiError with 400 status code', () => {
      mockRequest.query = {
        country: '-1',
      };

      try {
        validateSearchFilters(mockRequest as Request, mockResponse as Response, mockNext);
        fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(400);
          expect(error.message).toContain('Invalid filters');
        }
      }
    });

    it('should strip unknown fields', () => {
      mockRequest.query = {
        country: '42',
        unknown_field: 'should be removed',
        page: '1',
        limit: '20',
      };

      validateSearchFilters(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.query).not.toHaveProperty('unknown_field');
      expect(mockRequest.query).toHaveProperty('country');
    });

    it('should validate multiple errors and include all in message', () => {
      mockRequest.query = {
        status: 'invalid',
        country: '-1',
        limit: '200',
      };

      try {
        validateSearchFilters(mockRequest as Request, mockResponse as Response, mockNext);
        fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.message).toContain('Invalid filters');
          // Should contain multiple error messages (Joi may split some messages)
          const errorParts = error.message.split(',').map((s) => s.trim());
          expect(errorParts.length).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });

  describe('userRankingsSchema', () => {
    it('should validate valid user rankings parameters', () => {
      const validParams = {
        metric: 'history_whole_open',
        country: 42,
        limit: 20,
        order: 'desc',
      };

      const { error } = userRankingsSchema.validate(validParams);
      expect(error).toBeUndefined();
    });

    it('should require metric parameter', () => {
      const invalidParams = {
        limit: 20,
      };

      const { error } = userRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('required');
    });

    it('should reject invalid metric', () => {
      const invalidParams = {
        metric: 'invalid_metric',
      };

      const { error } = userRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be one of');
    });

    it('should reject invalid order', () => {
      const invalidParams = {
        metric: 'history_whole_open',
        order: 'invalid_order',
      };

      const { error } = userRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
    });

    it('should reject limit greater than 100', () => {
      const invalidParams = {
        metric: 'history_whole_open',
        limit: 101,
      };

      const { error } = userRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
    });

    it('should reject limit less than 1', () => {
      const invalidParams = {
        metric: 'history_whole_open',
        limit: 0,
      };

      const { error } = userRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
    });

    it('should reject negative country', () => {
      const invalidParams = {
        metric: 'history_whole_open',
        country: -1,
      };

      const { error } = userRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
    });

    it('should apply default values for limit and order', () => {
      const params = {
        metric: 'history_whole_open',
      };

      const validationResult = userRankingsSchema.validate(params);
      const typedValue = validationResult.value as { limit?: number; order?: string };
      expect(typedValue.limit).toBe(10);
      expect(typedValue.order).toBe('desc');
    });

    it('should accept all valid metrics', () => {
      const validMetrics = [
        'history_whole_open',
        'history_whole_closed',
        'history_whole_commented',
        'resolution_rate',
        'avg_days_to_resolution',
      ];

      for (const metric of validMetrics) {
        const params = { metric };
        const { error } = userRankingsSchema.validate(params);
        expect(error).toBeUndefined();
      }
    });
  });

  describe('countryRankingsSchema', () => {
    it('should validate valid country rankings parameters', () => {
      const validParams = {
        metric: 'history_whole_open',
        limit: 20,
        order: 'desc',
      };

      const { error } = countryRankingsSchema.validate(validParams);
      expect(error).toBeUndefined();
    });

    it('should require metric parameter', () => {
      const invalidParams = {
        limit: 20,
      };

      const { error } = countryRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('required');
    });

    it('should reject invalid metric', () => {
      const invalidParams = {
        metric: 'invalid_metric',
      };

      const { error } = countryRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be one of');
    });

    it('should reject invalid order', () => {
      const invalidParams = {
        metric: 'history_whole_open',
        order: 'invalid_order',
      };

      const { error } = countryRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
    });

    it('should reject limit greater than 100', () => {
      const invalidParams = {
        metric: 'history_whole_open',
        limit: 101,
      };

      const { error } = countryRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
    });

    it('should reject limit less than 1', () => {
      const invalidParams = {
        metric: 'history_whole_open',
        limit: 0,
      };

      const { error } = countryRankingsSchema.validate(invalidParams);
      expect(error).toBeDefined();
    });

    it('should apply default values for limit and order', () => {
      const params = {
        metric: 'history_whole_open',
      };

      const validationResult = countryRankingsSchema.validate(params);
      const typedValue = validationResult.value as { limit?: number; order?: string };
      expect(typedValue.limit).toBe(10);
      expect(typedValue.order).toBe('desc');
    });

    it('should accept all valid metrics', () => {
      const validMetrics = [
        'history_whole_open',
        'history_whole_closed',
        'resolution_rate',
        'avg_days_to_resolution',
        'notes_health_score',
      ];

      for (const metric of validMetrics) {
        const params = { metric };
        const { error } = countryRankingsSchema.validate(params);
        expect(error).toBeUndefined();
      }
    });
  });

  describe('validateUserRankings middleware', () => {
    it('should call next() when parameters are valid', () => {
      mockRequest.query = {
        metric: 'history_whole_open',
        country: '42',
        limit: '20',
        order: 'desc',
      };

      validateUserRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with ApiError when metric is missing', () => {
      mockRequest.query = {
        limit: '20',
      };

      validateUserRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const firstCall = (mockNext as jest.Mock).mock.calls[0] as [unknown] | undefined;
      const errorArg = firstCall?.[0];
      expect(errorArg).toBeInstanceOf(ApiError);
      if (errorArg instanceof ApiError) {
        expect(errorArg.statusCode).toBe(400);
        expect(errorArg.message).toContain('Invalid parameters');
      }
    });

    it('should call next() with ApiError when metric is invalid', () => {
      mockRequest.query = {
        metric: 'invalid_metric',
      };

      validateUserRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const firstCall = (mockNext as jest.Mock).mock.calls[0] as [unknown] | undefined;
      const errorArg = firstCall?.[0];
      expect(errorArg).toBeInstanceOf(ApiError);
      if (errorArg instanceof ApiError) {
        expect(errorArg.statusCode).toBe(400);
      }
    });

    it('should strip unknown fields', () => {
      mockRequest.query = {
        metric: 'history_whole_open',
        unknown_field: 'should be removed',
        limit: '20',
      };

      validateUserRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.query).not.toHaveProperty('unknown_field');
      expect(mockRequest.query).toHaveProperty('metric');
    });
  });

  describe('validateCountryRankings middleware', () => {
    it('should call next() when parameters are valid', () => {
      mockRequest.query = {
        metric: 'history_whole_open',
        limit: '20',
        order: 'desc',
      };

      validateCountryRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with ApiError when metric is missing', () => {
      mockRequest.query = {
        limit: '20',
      };

      validateCountryRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const firstCall = (mockNext as jest.Mock).mock.calls[0] as [unknown] | undefined;
      const errorArg = firstCall?.[0];
      expect(errorArg).toBeInstanceOf(ApiError);
      if (errorArg instanceof ApiError) {
        expect(errorArg.statusCode).toBe(400);
        expect(errorArg.message).toContain('Invalid parameters');
      }
    });

    it('should call next() with ApiError when metric is invalid', () => {
      mockRequest.query = {
        metric: 'invalid_metric',
      };

      validateCountryRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const firstCall = (mockNext as jest.Mock).mock.calls[0] as [unknown] | undefined;
      const errorArg = firstCall?.[0];
      expect(errorArg).toBeInstanceOf(ApiError);
      if (errorArg instanceof ApiError) {
        expect(errorArg.statusCode).toBe(400);
      }
    });

    it('should strip unknown fields', () => {
      mockRequest.query = {
        metric: 'history_whole_open',
        unknown_field: 'should be removed',
        limit: '20',
      };

      validateCountryRankings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.query).not.toHaveProperty('unknown_field');
      expect(mockRequest.query).toHaveProperty('metric');
    });
  });
});
