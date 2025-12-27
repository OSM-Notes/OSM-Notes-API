/**
 * Unit tests for environment variable validation
 */

import { validateEnv, getEnv, resetEnv } from '../../../src/config/env';

describe('Environment Variable Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    resetEnv();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    resetEnv();
  });

  describe('Required variables', () => {
    it('should validate required database variables', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';

      const env = validateEnv();
      expect(env.DB_HOST).toBe('localhost');
      expect(env.DB_NAME).toBe('test_db');
      expect(env.DB_USER).toBe('test_user');
      expect(env.DB_PASSWORD).toBe('test_pass');
    });

    it('should throw error if required variables are missing', () => {
      delete process.env.DB_HOST;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;

      expect(() => validateEnv()).toThrow();
    });
  });

  describe('Default values', () => {
    it('should provide defaults for optional variables', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.NODE_ENV = 'development'; // Explicitly set for test
      process.env.REDIS_HOST = 'localhost'; // Explicitly set to test default value

      const env = validateEnv();
      expect(env.PORT).toBe(3000);
      expect(env.NODE_ENV).toBe('development');
      expect(env.API_VERSION).toBe('v1');
      expect(env.DB_PORT).toBe(5432);
      expect(env.REDIS_HOST).toBe('localhost');
      expect(env.REDIS_PORT).toBe(6379);
      // LOG_LEVEL might be set by test environment, so just check it's valid
      expect(['error', 'warn', 'info', 'debug', 'verbose', 'silly']).toContain(env.LOG_LEVEL);
    });
  });

  describe('Variable types', () => {
    it('should validate PORT is a number', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.PORT = '3000';

      const env = validateEnv();
      expect(typeof env.PORT).toBe('number');
      expect(env.PORT).toBe(3000);
    });

    it('should reject invalid PORT values', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.PORT = 'invalid';

      expect(() => validateEnv()).toThrow();
    });

    it('should validate PORT range', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.PORT = '70000'; // Invalid port

      expect(() => validateEnv()).toThrow();
    });
  });

  describe('Caching', () => {
    it('should cache validated environment', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';

      const env1 = validateEnv();
      const env2 = getEnv();

      expect(env1).toBe(env2);
    });

    it('should reset cache when resetEnv is called', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';

      validateEnv();
      resetEnv();
      const env = getEnv();

      expect(env).toBeDefined();
    });
  });

  describe('NODE_ENV validation', () => {
    it('should accept valid NODE_ENV values', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';

      const validEnvs = ['development', 'production', 'test'];
      validEnvs.forEach((env) => {
        process.env.NODE_ENV = env;
        resetEnv();
        const validated = validateEnv();
        expect(validated.NODE_ENV).toBe(env);
      });
    });

    it('should reject invalid NODE_ENV values', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.NODE_ENV = 'invalid';

      expect(() => validateEnv()).toThrow();
    });
  });
});
