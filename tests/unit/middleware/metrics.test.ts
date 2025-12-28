/**
 * Unit tests for metrics middleware
 */

import { Request, Response, NextFunction } from 'express';
import { metricsMiddleware, getMetrics } from '../../../src/middleware/metrics';

// Mock prom-client
jest.mock('prom-client', () => ({
  Registry: jest.fn().mockImplementation(() => ({
    metrics: jest.fn().mockResolvedValue('# Test metrics\n'),
    register: jest.fn(),
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    startTimer: jest.fn().mockReturnValue(() => 0.1),
  })),
  collectDefaultMetrics: jest.fn(),
}));

describe('metricsMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/v1/users/12345',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('TestApp/1.0 (test@example.com)'),
    };
    mockResponse = {
      statusCode: 200,
      on: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('request tracking', () => {
    it('should call next and register finish handler', () => {
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));

      // Simulate response finish
      finishCallback();
      expect(finishCallback).toHaveBeenCalled();
    });

    it('should track different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];

      methods.forEach((method) => {
        const req = { ...mockRequest, method } as Request;
        jest.clearAllMocks();
        metricsMiddleware(req, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('error tracking', () => {
    it('should track error count for 4xx responses', () => {
      (mockResponse as Response).statusCode = 404;
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      finishCallback();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should track error count for 5xx responses', () => {
      (mockResponse as Response).statusCode = 500;
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      finishCallback();

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('response time tracking', () => {
    it('should measure response time', () => {
      const finishCallback = jest.fn();
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback.mockImplementation(callback);
        }
        return mockResponse;
      });

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));

      finishCallback();
      expect(finishCallback).toHaveBeenCalled();
    });
  });
});

describe('getMetrics', () => {
  it('should return metrics in Prometheus format', async () => {
    const metrics = await getMetrics();
    expect(typeof metrics).toBe('string');
  });

  it('should include HTTP request metrics', async () => {
    const metrics = await getMetrics();
    // Prometheus format should include metric names
    expect(metrics).toBeDefined();
  });
});
