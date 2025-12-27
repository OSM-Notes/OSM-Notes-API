/**
 * Unit tests for validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { validateSearchFilters, searchFiltersSchema } from '../../../src/middleware/validation';
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
});
