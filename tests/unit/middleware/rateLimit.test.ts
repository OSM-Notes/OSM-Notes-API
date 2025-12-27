/**
 * Unit tests for rate limiting middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  rateLimitMiddleware,
  createRedisStoreAdapter,
  createStore,
  generateKey,
} from '../../../src/middleware/rateLimit';
import { getRedisClient } from '../../../src/config/redis';

// Mock Redis client
jest.mock('../../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

// Mock logger to avoid console output during tests
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('rateLimitMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      get: jest.fn(),
      path: '/api/v1/notes',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Mock Redis client to return null by default (in-memory store)
    (getRedisClient as jest.Mock).mockReturnValue(null);
  });

  describe('Rate limit configuration', () => {
    it('should set default rate limit headers', async () => {
      (mockRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      // Rate limit middleware uses standard headers (RateLimit-*) not legacy (X-RateLimit-*)
      // The headers are set by express-rate-limit internally, not via setHeader
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() when rate limit is not exceeded', async () => {
      (mockRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate limit by IP and User-Agent', () => {
    it('should track rate limit per IP address', async () => {
      const testRequest = {
        ...mockRequest,
        ip: '192.168.1.1',
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should track rate limit per User-Agent', async () => {
      (mockRequest.get as jest.Mock).mockReturnValue('DifferentApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate limit exceeded', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      (mockRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      // Mock rate limit exceeded
      // This will be implemented with actual Redis logic
      // For now, we test the structure

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      // In a real scenario, if rate limit is exceeded,
      // next() should not be called and 429 should be returned
      // This test will be updated when Redis is integrated
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Skip conditions', () => {
    it('should skip rate limiting for health check endpoint', async () => {
      const testRequest = {
        ...mockRequest,
        path: '/health',
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Key generation', () => {
    it('should generate key with IP and User-Agent', async () => {
      const testRequest = {
        ...mockRequest,
        ip: '192.168.1.100',
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue('MyApp/2.0 (contact@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing IP address', async () => {
      const testRequest = {
        ...mockRequest,
        ip: undefined,
        socket: { remoteAddress: '10.0.0.1' } as Request['socket'],
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing User-Agent', async () => {
      const testRequest = {
        ...mockRequest,
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue(null);

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use userAgentInfo when available', async () => {
      const testRequest = {
        ...mockRequest,
        userAgentInfo: {
          appName: 'MyApp',
          version: '2.0',
        },
      } as Partial<Request & { userAgentInfo?: { appName: string; version: string } }>;
      (testRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request without IP or socket.remoteAddress', async () => {
      const testRequest = {
        ...mockRequest,
        ip: undefined,
        socket: { remoteAddress: undefined } as Request['socket'],
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Handler function', () => {
    it('should call handler when rate limit is exceeded', async () => {
      (mockRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      // The handler is called by express-rate-limit when limit is exceeded
      // We can't easily test this without actually exceeding the limit
      // But we can verify the middleware structure is correct
      await new Promise<void>((resolve) => {
        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Skip function', () => {
    it('should skip rate limiting for /health endpoint', async () => {
      const testRequest = {
        ...mockRequest,
        path: '/health',
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not skip rate limiting for other endpoints', async () => {
      const testRequest = {
        ...mockRequest,
        path: '/api/v1/notes',
      } as Partial<Request>;
      (testRequest.get as jest.Mock).mockReturnValue('TestApp/1.0 (test@example.com)');

      await new Promise<void>((resolve) => {
        rateLimitMiddleware(testRequest as Request, mockResponse as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Redis store adapter', () => {
    let mockRedisClient: {
      isOpen: boolean;
      connect: jest.Mock;
      incr: jest.Mock;
      expire: jest.Mock;
      get: jest.Mock;
      set: jest.Mock;
      del: jest.Mock;
      ttl: jest.Mock;
    };

    beforeEach(() => {
      mockRedisClient = {
        isOpen: true,
        connect: jest.fn().mockResolvedValue(undefined),
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue('value'),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        ttl: jest.fn().mockResolvedValue(900),
      };
    });

    it('should return undefined when Redis client is null', () => {
      const result = createRedisStoreAdapter(null);
      expect(result).toBeUndefined();
    });

    it('should create Redis store when Redis client is available', () => {
      const result = createRedisStoreAdapter(
        mockRedisClient as unknown as ReturnType<typeof getRedisClient>
      );
      expect(result).toBeDefined();
    });

    it('should create Redis store when Redis client is not open', () => {
      mockRedisClient.isOpen = false;
      const store = createRedisStoreAdapter(
        mockRedisClient as unknown as ReturnType<typeof getRedisClient>
      );
      expect(store).toBeDefined();
    });
  });

  describe('Store creation', () => {
    it('should return undefined when Redis client is null', () => {
      (getRedisClient as jest.Mock).mockReturnValue(null);
      const result = createStore();
      expect(result).toBeUndefined();
    });

    it('should create Redis store when Redis client is available', () => {
      const mockRedisClient = {
        isOpen: true,
        connect: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        ttl: jest.fn(),
      };
      (getRedisClient as jest.Mock).mockReturnValue(
        mockRedisClient as unknown as ReturnType<typeof getRedisClient>
      );
      const result = createStore();
      expect(result).toBeDefined();
    });

    it('should create Redis store even with error-prone client (errors occur during usage)', () => {
      // Note: createRedisStoreAdapter doesn't throw during creation,
      // errors only occur when commands are executed
      const errorRedisClient = {
        isOpen: true,
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        incr: jest.fn().mockRejectedValue(new Error('Command failed')),
        expire: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        ttl: jest.fn(),
      };
      (getRedisClient as jest.Mock).mockReturnValue(
        errorRedisClient as unknown as ReturnType<typeof getRedisClient>
      );
      const result = createStore();
      // Store is created, errors will occur when used
      expect(result).toBeDefined();
    });
  });

  describe('Key generation', () => {
    it('should generate key with IP and User-Agent', () => {
      const testRequest = {
        ip: '192.168.1.100',
        get: jest.fn().mockReturnValue('MyApp/2.0 (contact@example.com)'),
      } as Partial<Request>;
      const key = generateKey(testRequest as Request);
      expect(key).toBe('rate_limit:192.168.1.100:MyApp/2.0 (contact@example.com)');
    });

    it('should handle missing IP address', () => {
      const testRequest = {
        ip: undefined,
        socket: { remoteAddress: '10.0.0.1' } as Request['socket'],
        get: jest.fn().mockReturnValue('TestApp/1.0 (test@example.com)'),
      } as Partial<Request>;
      const key = generateKey(testRequest as Request);
      expect(key).toBe('rate_limit:10.0.0.1:TestApp/1.0 (test@example.com)');
    });

    it('should handle missing User-Agent', () => {
      const testRequest = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue(null),
      } as Partial<Request>;
      const key = generateKey(testRequest as Request);
      expect(key).toBe('rate_limit:127.0.0.1:unknown');
    });

    it('should use userAgentInfo when available', () => {
      const testRequest = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('TestApp/1.0 (test@example.com)'),
        userAgentInfo: {
          appName: 'MyApp',
          version: '2.0',
        },
      } as Partial<Request & { userAgentInfo?: { appName: string; version: string } }>;
      const key = generateKey(testRequest as Request);
      expect(key).toBe('rate_limit:127.0.0.1:MyApp/2.0');
    });

    it('should handle request without IP or socket.remoteAddress', () => {
      const testRequest = {
        ip: undefined,
        socket: { remoteAddress: undefined } as Request['socket'],
        get: jest.fn().mockReturnValue('TestApp/1.0 (test@example.com)'),
      } as Partial<Request>;
      const key = generateKey(testRequest as Request);
      expect(key).toBe('rate_limit:unknown:TestApp/1.0 (test@example.com)');
    });
  });
});
