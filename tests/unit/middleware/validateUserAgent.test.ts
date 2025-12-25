/**
 * Unit tests for User-Agent validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { validateUserAgent, UserAgentInfo } from '../../../src/middleware/validateUserAgent';

describe('validateUserAgent Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      get: jest.fn(),
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('User-Agent format validation', () => {
    it('should reject request without User-Agent header', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const mockJson = mockResponse.json as jest.Mock;
      const calls = mockJson.mock.calls as Array<Array<unknown>>;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      if (firstCall && firstCall.length > 0) {
        const jsonCall = firstCall[0] as {
          error: string;
          message: string;
          statusCode: number;
        };
        expect(jsonCall).toHaveProperty('error');
        expect(typeof jsonCall.error).toBe('string');
      }
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject User-Agent with invalid format', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('InvalidUserAgent');

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject User-Agent without contact information', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('MyApp/1.0');

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject User-Agent with invalid contact (not email or URL)', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('MyApp/1.0 (invalid-contact)');

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept User-Agent with valid email contact', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('MyApp/1.0 (contact@example.com)');

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should accept User-Agent with valid URL contact', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('MyApp/1.0 (https://example.com/contact)');

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should extract information correctly', () => {
      const userAgent = 'MyApp/1.0 (contact@example.com)';
      (mockRequest.get as jest.Mock).mockReturnValue(userAgent);

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const reqWithInfo = mockRequest as Request & {
        userAgentInfo?: UserAgentInfo;
      };
      expect(reqWithInfo.userAgentInfo).toBeDefined();
    });

    it('should handle User-Agent with spaces in app name', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('My App/1.0 (contact@example.com)');

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle User-Agent with version containing dots', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('MyApp/1.2.3 (contact@example.com)');

      validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Contact validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = ['user@example.com', 'user.name@example.com', 'user+tag@example.co.uk'];

      validEmails.forEach((email) => {
        mockRequest = {
          get: jest.fn().mockReturnValue(`MyApp/1.0 (${email})`),
          ip: '127.0.0.1',
        };
        mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();

        validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    it('should accept valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/contact',
        'https://www.example.com',
      ];

      validUrls.forEach((url) => {
        mockRequest = {
          get: jest.fn().mockReturnValue(`MyApp/1.0 (${url})`),
          ip: '127.0.0.1',
        };
        mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();

        validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = ['notanemail', '@example.com', 'user@'];

      invalidEmails.forEach((email) => {
        mockRequest = {
          get: jest.fn().mockReturnValue(`MyApp/1.0 (${email})`),
          ip: '127.0.0.1',
        };
        mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();

        validateUserAgent(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });
  });
});
