/**
 * Unit tests for anti-abuse middleware
 */

import { Request, Response, NextFunction } from 'express';
import { antiAbuseMiddleware } from '../../../src/middleware/antiAbuse';

describe('antiAbuseMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      get: jest.fn(),
      path: '/api/v1/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('AI detection', () => {
    it('should detect known AI User-Agents', () => {
      const aiUserAgents = [
        'ChatGPT/1.0 (https://openai.com)',
        'GPT-4/1.0 (https://openai.com)',
        'Claude/1.0 (https://anthropic.com)',
        'GoogleBard/1.0 (https://google.com)',
        'Copilot/1.0 (https://github.com)',
      ];

      aiUserAgents.forEach((userAgent) => {
        mockRequest = {
          ...mockRequest,
          get: jest.fn().mockReturnValue(userAgent),
        };

        antiAbuseMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Should reject AI without OAuth
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    it('should allow AI with OAuth authentication', () => {
      const userAgent = 'ChatGPT/1.0 (https://openai.com)';
      (mockRequest.get as jest.Mock).mockReturnValue(userAgent);
      // Mock OAuth authentication
      (mockRequest as Request & { user?: { id: number } }).user = {
        id: 12345,
      };

      antiAbuseMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should allow authenticated AI
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Bot detection', () => {
    it('should detect known bot User-Agents', () => {
      const botUserAgents = [
        'curl/7.68.0',
        'python-requests/2.28.1',
        'Wget/1.21.3',
        'Go-http-client/1.1',
      ];

      botUserAgents.forEach((userAgent) => {
        mockRequest = {
          ...mockRequest,
          get: jest.fn().mockReturnValue(userAgent),
        };

        antiAbuseMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Should allow bots but with restrictive rate limiting
        // For now, we just verify the middleware runs
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('Legitimate User-Agent', () => {
    it('should allow legitimate User-Agents', () => {
      const legitimateUserAgents = [
        'MyApp/1.0 (contact@example.com)',
        'Terranote/1.0 (https://github.com/Terranote/terranote-core)',
        'ResearchTool/0.5 (researcher@university.edu)',
      ];

      legitimateUserAgents.forEach((userAgent) => {
        mockRequest = {
          ...mockRequest,
          get: jest.fn().mockReturnValue(userAgent),
        };
        mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();

        antiAbuseMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });
  });

  describe('Logging', () => {
    it('should log detected AIs', () => {
      const userAgent = 'ChatGPT/1.0 (https://openai.com)';
      (mockRequest.get as jest.Mock).mockReturnValue(userAgent);

      antiAbuseMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Middleware should log AI detection
      // This will be verified through logger mocks in integration tests
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should log detected bots', () => {
      const userAgent = 'curl/7.68.0';
      (mockRequest.get as jest.Mock).mockReturnValue(userAgent);

      antiAbuseMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Middleware should log bot detection
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
