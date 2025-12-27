/**
 * Unit tests for error handler middleware
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, ApiError } from '../../../src/middleware/errorHandler';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

/**
 * Helper function to safely get error from mock next function
 */
function getErrorFromMockNext(mockNext: jest.Mock): ApiError | null {
  const calls = mockNext.mock.calls;
  if (calls.length > 0 && calls[0] && Array.isArray(calls[0]) && calls[0].length > 0) {
    return calls[0][0] as ApiError;
  }
  return null;
}

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

    mockRequest = {
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = jest.fn();

    // Reset environment
    delete process.env.NODE_ENV;
    jest.clearAllMocks();
  });

  describe('ApiError handling', () => {
    it('should handle ApiError with operational flag', () => {
      const error = new ApiError(400, 'Bad Request', true);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Bad Request',
        statusCode: 400,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle ApiError with different status codes', () => {
      const statusCodes = [401, 403, 404, 429, 500, 502, 503];

      statusCodes.forEach((statusCode) => {
        const error = new ApiError(statusCode, 'Test error', true);
        jsonSpy.mockClear();
        statusSpy.mockClear();

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(statusCode);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode,
          })
        );
      });
    });

    it('should handle ApiError with non-operational flag', () => {
      const error = new ApiError(500, 'Internal error', false);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Should treat as unknown error
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });

  describe('Unknown error handling', () => {
    it('should handle generic Error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Generic error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Generic error',
        statusCode: 500,
        stack: error.stack,
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle generic Error in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Generic error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Internal server error',
        statusCode: 500,
      });
      // Type assertion needed for mock call arguments
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const firstCall = jsonSpy.mock.calls[0];
      if (firstCall && Array.isArray(firstCall) && firstCall.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const responseBody = firstCall[0] as { stack?: unknown };
        expect(responseBody).not.toHaveProperty('stack');
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Error with statusCode property', () => {
      const error: Error & { statusCode: number } = Object.assign(new Error('Error with status'), {
        statusCode: 502,
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(502);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 502,
        })
      );
    });

    it('should handle unknown status codes', () => {
      const error: Error & { statusCode: number } = Object.assign(new Error('Unknown error'), {
        statusCode: 999,
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(999);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error', // Default error name for unknown status codes
          statusCode: 999,
        })
      );
    });
  });

  describe('Error logging', () => {
    it('should log error details', () => {
      const error = new ApiError(400, 'Test error', true);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Error occurred', {
        error: 'Test error',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stack: expect.any(String),
        path: '/test',
        method: 'GET',
        ip: '127.0.0.1',
      });
    });
  });
});

describe('notFoundHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/nonexistent',
    };

    mockResponse = {};

    mockNext = jest.fn();
  });

  it('should create ApiError and call next', () => {
    notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = getErrorFromMockNext(mockNext);
    expect(error).not.toBeNull();
    if (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Route GET /nonexistent not found');
    }
  });

  it('should handle different HTTP methods', () => {
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach((method) => {
      const testRequest = {
        ...mockRequest,
        method,
      } as Partial<Request>;
      mockNext.mockClear();

      notFoundHandler(testRequest as Request, mockResponse as Response, mockNext as NextFunction);

      const error = getErrorFromMockNext(mockNext);
      expect(error).not.toBeNull();
      if (error) {
        expect(error.message).toContain(method);
      }
    });
  });

  it('should handle different paths', () => {
    const paths = ['/api/v1/users', '/api/v1/notes/123', '/health'];

    paths.forEach((path) => {
      const testRequest = {
        ...mockRequest,
        path,
      } as Partial<Request>;
      mockNext.mockClear();

      notFoundHandler(testRequest as Request, mockResponse as Response, mockNext as NextFunction);

      const error = getErrorFromMockNext(mockNext);
      expect(error).not.toBeNull();
      if (error) {
        expect(error.message).toContain(path);
      }
    });
  });
});

describe('ApiError class', () => {
  it('should create ApiError with default isOperational', () => {
    const error = new ApiError(400, 'Test error');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Test error');
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('should create ApiError with custom isOperational', () => {
    const error = new ApiError(500, 'Test error', false);

    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Test error');
    expect(error.isOperational).toBe(false);
  });

  it('should capture stack trace', () => {
    const error = new ApiError(400, 'Test error');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('Test error');
    // Stack trace should exist (may or may not contain class name depending on Node.js version)
    expect(typeof error.stack).toBe('string');
  });
});
