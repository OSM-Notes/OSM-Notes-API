/**
 * Unit tests for request logger middleware
 */

import { Request, Response, NextFunction } from 'express';
import { requestLogger, getRequestId } from '../../../src/middleware/requestLogger';
import { logger } from '../../../src/utils/logger';

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234'),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('requestLogger middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/v1/users/12345',
      originalUrl: '/api/v1/users/12345?page=1',
      query: { page: '1' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('TestApp/1.0 (test@example.com)'),
    };
    mockResponse = {
      statusCode: 200,
      getHeader: jest.fn(),
      on: jest.fn(),
      writableEnded: false,
    };
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('request ID generation', () => {
    it('should generate unique request ID', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.requestId).toBeDefined();
      expect(typeof mockRequest.requestId).toBe('string');
      expect(mockRequest.requestId).toBe('test-uuid-1234');
    });

    it('should generate different request IDs for different requests', () => {
      // Get the mocked crypto module
      const cryptoModule = jest.requireMock<{ randomUUID: jest.Mock }>('crypto');
      let callCount = 0;
      cryptoModule.randomUUID.mockImplementation(() => {
        callCount++;
        return `test-uuid-${callCount}`;
      });

      const req1 = { ...mockRequest } as Request;
      const req2 = { ...mockRequest } as Request;

      requestLogger(req1, mockResponse as Response, mockNext);
      requestLogger(req2, mockResponse as Response, mockNext);

      expect(req1.requestId).toBe('test-uuid-1');
      expect(req2.requestId).toBe('test-uuid-2');

      // Reset mock
      cryptoModule.randomUUID.mockReset();
      cryptoModule.randomUUID.mockReturnValue('test-uuid-1234');
    });

    it('should set startTime', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.startTime).toBeDefined();
      expect(typeof mockRequest.startTime).toBe('number');
      expect(mockRequest.startTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('request logging', () => {
    it('should log incoming request', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          requestId: mockRequest.requestId,
          method: 'GET',
          path: '/api/v1/users/12345',
          ip: '127.0.0.1',
        })
      );
    });

    it('should include query parameters in log', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          query: { page: '1' },
        })
      );
    });

    it('should include User-Agent in log', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          userAgent: 'TestApp/1.0 (test@example.com)',
        })
      );
    });

    it('should call next()', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('response logging', () => {
    it('should log response on finish', () => {
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response finish
      finishCallback();

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          requestId: mockRequest.requestId,
          method: 'GET',
          path: '/api/v1/users/12345',
          statusCode: 200,
        })
      );
    });

    it('should log response time', () => {
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Wait a bit to ensure time difference
      setTimeout(() => {
        finishCallback();

        expect(logger.info).toHaveBeenCalledWith(
          'Request completed',
          expect.objectContaining({
            responseTime: expect.stringMatching(/\d+ms/) as unknown,
            responseTimeMs: expect.any(Number) as unknown,
          })
        );
      }, 10);
    });

    it('should log error level for 5xx responses', () => {
      (mockResponse as Response).statusCode = 500;
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      finishCallback();

      expect(logger.error).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('should log warn level for 4xx responses', () => {
      (mockResponse as Response).statusCode = 404;
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      finishCallback();

      expect(logger.warn).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });
  });

  describe('slow request detection', () => {
    it('should log warning for slow requests (> 1 second)', () => {
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(() => {
            // Simulate slow request by setting startTime to 1.5 seconds ago
            (mockRequest as Request & { startTime?: number }).startTime = Date.now() - 1500;
            callback();
          });
        }
        return mockResponse;
      });

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      finishCallback();

      expect(logger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          responseTimeMs: expect.any(Number) as unknown,
          threshold: '1000ms',
        })
      );
    });
  });

  describe('getRequestId', () => {
    it('should return request ID from request', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const requestId = getRequestId(mockRequest as Request);
      expect(requestId).toBe(mockRequest.requestId);
    });

    it('should return undefined if request ID not set', () => {
      const req = { ...mockRequest } as Request;
      delete req.requestId;

      const requestId = getRequestId(req);
      expect(requestId).toBeUndefined();
    });
  });
});
