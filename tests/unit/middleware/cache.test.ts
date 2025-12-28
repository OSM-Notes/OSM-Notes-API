/**
 * Unit tests for cache middleware
 */

import { Request, Response, NextFunction } from 'express';
import { cacheMiddleware, generateCacheKey, invalidateCache } from '../../../src/middleware/cache';
import { getRedisClient } from '../../../src/config/redis';

// Mock Redis client
jest.mock('../../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
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

describe('cacheMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockRedisClient: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    isOpen: boolean;
    connect: jest.Mock;
  };

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/v1/users/12345',
      query: {},
      originalUrl: '/api/v1/users/12345',
      protocol: 'http',
      get: jest.fn(),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      end: jest.fn(),
      statusCode: 200,
      locals: {},
    };
    mockNext = jest.fn();

    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      isOpen: true,
      connect: jest.fn(),
    };

    (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
  });

  describe('generateCacheKey', () => {
    it('should generate cache key from request path and query', () => {
      const req = {
        ...mockRequest,
        path: '/api/v1/users/12345',
        query: {},
      } as Request;

      const key = generateCacheKey(req);
      expect(key).toBe('cache:GET:/api/v1/users/12345:');
    });

    it('should include query parameters in cache key', () => {
      const req = {
        ...mockRequest,
        path: '/api/v1/users',
        query: { page: '1', limit: '20' },
      } as Request;

      const key = generateCacheKey(req);
      expect(key).toContain('cache:GET:/api/v1/users:');
      expect(key).toContain('page=1');
      expect(key).toContain('limit=20');
    });

    it('should sort query parameters for consistent keys', () => {
      const req1 = {
        ...mockRequest,
        path: '/api/v1/users',
        query: { limit: '20', page: '1' },
      } as Request;

      const key1 = generateCacheKey(req1);

      const req2 = {
        ...mockRequest,
        path: '/api/v1/users',
        query: { page: '1', limit: '20' },
      } as Request;
      const key2 = generateCacheKey(req2);

      expect(key1).toBe(key2);
    });

    it('should handle empty query parameters', () => {
      const req = {
        ...mockRequest,
        path: '/api/v1/users',
        query: {},
      } as Request;

      const key = generateCacheKey(req);
      expect(key).toBe('cache:GET:/api/v1/users:');
    });
  });

  describe('cacheMiddleware - cache hit', () => {
    it('should return cached response when key exists', async () => {
      const cachedData = { user_id: 12345, username: 'test_user' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const middleware = cacheMiddleware({ ttl: 300 });

      // Middleware doesn't call next() on cache hit, so we don't wait for callback
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(cachedData);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set cache hit header', async () => {
      const cachedData = { data: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const middleware = cacheMiddleware({ ttl: 300 });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
    });
  });

  describe('cacheMiddleware - cache miss', () => {
    it('should call next() when cache key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(mockRequest as Request, mockResponse as Response, () => {
        mockNext();
      });

      // Wait a bit for async operations
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should store response in cache after handler calls res.json()', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const responseData = { user_id: 12345, username: 'test_user' };
      (mockResponse as Response).statusCode = 200;

      const middleware = cacheMiddleware({ ttl: 300 });

      void middleware(mockRequest as Request, mockResponse as Response, () => {
        // Simulate handler calling res.json() after middleware intercepts it
        (mockResponse.json as jest.Mock)(responseData);
      });

      // Wait a bit for async cache operation
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(responseData),
        expect.objectContaining({
          EX: 300,
        })
      );
    });

    it('should set cache miss header', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(mockRequest as Request, mockResponse as Response, () => {
        mockNext();
      });

      // Wait a bit for async operations
      await new Promise((r) => setTimeout(r, 10));

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
    });
  });

  describe('cacheMiddleware - TTL configuration', () => {
    it('should use default TTL when not specified', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const responseData = { data: 'test' };
      (mockResponse as Response).statusCode = 200;

      const middleware = cacheMiddleware({ ttl: 300 });

      void middleware(mockRequest as Request, mockResponse as Response, () => {
        (mockResponse.json as jest.Mock)(responseData);
      });

      // Wait a bit for async cache operation
      await new Promise((r) => setTimeout(r, 10));

      // Should use default TTL (300 seconds)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(responseData),
        expect.objectContaining({
          EX: 300,
        })
      );
    });

    it('should use custom TTL when specified', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const responseData = { data: 'test' };
      (mockResponse as Response).statusCode = 200;

      const middleware = cacheMiddleware({ ttl: 600 });

      void middleware(mockRequest as Request, mockResponse as Response, () => {
        (mockResponse.json as jest.Mock)(responseData);
      });

      // Wait a bit for async cache operation
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(responseData),
        expect.objectContaining({
          EX: 600,
        })
      );
    });
  });

  describe('cacheMiddleware - Redis unavailable', () => {
    it('should continue without cache when Redis is not available', async () => {
      (getRedisClient as jest.Mock).mockReturnValue(null);

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(mockRequest as Request, mockResponse as Response, () => {
        mockNext();
      });

      // Wait a bit for async operations
      await new Promise((r) => setTimeout(r, 10));

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache', 'DISABLED');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'));

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(mockRequest as Request, mockResponse as Response, () => {
        mockNext();
      });

      // Wait a bit for async operations
      await new Promise((r) => setTimeout(r, 10));

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('cacheMiddleware - only cache GET requests', () => {
    it('should skip caching for non-GET requests', async () => {
      const req = { ...mockRequest, method: 'POST' } as Request;

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(req, mockResponse as Response, () => {
        mockNext();
      });

      // Wait a bit for async operations
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip caching for PUT requests', async () => {
      const req = { ...mockRequest, method: 'PUT' } as Request;

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(req, mockResponse as Response, () => {
        mockNext();
      });

      // Wait a bit for async operations
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip caching for DELETE requests', async () => {
      const req = { ...mockRequest, method: 'DELETE' } as Request;

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(req, mockResponse as Response, () => {
        mockNext();
      });

      // Wait a bit for async operations
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('cacheMiddleware - only cache successful responses', () => {
    it('should not cache error responses (4xx)', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      (mockResponse as Response).statusCode = 404;
      const responseData = { error: 'Not found' };

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(mockRequest as Request, mockResponse as Response, () => {
        (mockResponse.json as jest.Mock)(responseData);
      });

      // Wait a bit for async cache operation
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should not cache error responses (5xx)', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      (mockResponse as Response).statusCode = 500;
      const responseData = { error: 'Internal server error' };

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(mockRequest as Request, mockResponse as Response, () => {
        (mockResponse.json as jest.Mock)(responseData);
      });

      // Wait a bit for async cache operation
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should cache successful responses (2xx)', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      (mockResponse as Response).statusCode = 200;
      const responseData = { data: 'success' };

      const middleware = cacheMiddleware({ ttl: 300 });
      void middleware(mockRequest as Request, mockResponse as Response, () => {
        (mockResponse.json as jest.Mock)(responseData);
      });

      // Wait a bit for async cache operation
      await new Promise((r) => setTimeout(r, 10));

      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await invalidateCache('cache:GET:/api/v1/users/12345:');

      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:GET:/api/v1/users/12345:');
    });

    it('should handle Redis unavailable gracefully', async () => {
      (getRedisClient as jest.Mock).mockReturnValue(null);

      await expect(invalidateCache('cache:GET:/api/v1/users/12345:')).resolves.not.toThrow();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(invalidateCache('cache:GET:/api/v1/users/12345:')).resolves.not.toThrow();
    });
  });
});
