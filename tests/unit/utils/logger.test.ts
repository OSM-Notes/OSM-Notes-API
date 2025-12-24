/**
 * Unit tests for logger utility
 */

import { logger, createChildLogger, loggerStream } from '../../../src/utils/logger';

describe('Logger', () => {
  describe('Logger instance', () => {
    it('should have logger instance', () => {
      expect(logger).toBeDefined();
    });

    it('should have required log methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Logging methods', () => {
    it('should log error messages without throwing', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should log warning messages without throwing', () => {
      expect(() => logger.warn('Test warning message')).not.toThrow();
    });

    it('should log info messages without throwing', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should log debug messages without throwing', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    it('should log with metadata', () => {
      expect(() => logger.info('Test message', { key: 'value', number: 123 })).not.toThrow();
    });
  });

  describe('Log levels', () => {
    it('should respect log level configuration', () => {
      // Logger should be configured with a level
      expect(logger.level).toBeDefined();
    });
  });

  describe('createChildLogger', () => {
    it('should create a child logger with metadata', () => {
      const childLogger = createChildLogger({ component: 'test' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('loggerStream', () => {
    it('should have write method', () => {
      expect(typeof loggerStream.write).toBe('function');
    });

    it('should write messages without throwing', () => {
      expect(() => loggerStream.write('Test message')).not.toThrow();
    });
  });
});
