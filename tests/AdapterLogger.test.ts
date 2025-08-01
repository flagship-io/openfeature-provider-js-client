import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdapterLogger } from '../src/AdapterLogger';
import { LogLevel } from '@flagship.io/js-sdk';
import { Logger } from '@openfeature/web-sdk';

describe('AdapterLogger', () => {
  let mockLogger: Logger;
  let adapterLogger: AdapterLogger;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    };
    adapterLogger = new AdapterLogger(mockLogger);
  });

  describe('formatLogOutput', () => {
    it('should format log output with correct structure', () => {

      const mockDate = new Date(2023, 0, 1, 12, 30, 45, 123);
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = adapterLogger.formatLogOutput(LogLevel.INFO, 'Test message', 'TestTag');


      expect(result).toContain('[2023-01-01 12:30:45.123]');
      expect(result).toContain('[Flagship SDK]');
      expect(result).toContain('[INFO]');
      expect(result).toContain('[TestTag]');
      expect(result).toContain('Test message');

      vi.restoreAllMocks();
    });

    it('should include color codes based on log level', () => {
      const infoResult = adapterLogger.formatLogOutput(LogLevel.INFO, 'Info', 'Tag');
      const errorResult = adapterLogger.formatLogOutput(LogLevel.ERROR, 'Error', 'Tag');

      expect(infoResult).not.toEqual(errorResult);
      expect(infoResult).toContain('\x1b[');
      expect(infoResult).toContain('\x1b[0m');
    });

    it('should format timestamps with two-digit padding', () => {

      const mockDate = new Date(2023, 0, 1, 1, 2, 3, 4);
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = adapterLogger.formatLogOutput(LogLevel.INFO, 'Message', 'Tag');

      expect(result).toContain('[2023-01-01 01:02:03.004]');

      vi.restoreAllMocks();
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {

      vi.spyOn(adapterLogger, 'formatLogOutput').mockImplementation(
        (level, message, tag) => `[MOCK][${LogLevel[level]}] ${message} (${tag})`
      );
    });

    it('should call error logger for emergency logs', () => {
      adapterLogger.emergency('Emergency message', 'EmergencyTag');
      expect(mockLogger.error).toHaveBeenCalledWith('[MOCK][EMERGENCY] Emergency message (EmergencyTag)');
    });

    it('should call error logger for alert logs', () => {
      adapterLogger.alert('Alert message', 'AlertTag');
      expect(mockLogger.error).toHaveBeenCalledWith('[MOCK][ALERT] Alert message (AlertTag)');
    });

    it('should call error logger for critical logs', () => {
      adapterLogger.critical('Critical message', 'CriticalTag');
      expect(mockLogger.error).toHaveBeenCalledWith('[MOCK][CRITICAL] Critical message (CriticalTag)');
    });

    it('should call error logger for error logs', () => {
      adapterLogger.error('Error message', 'ErrorTag');
      expect(mockLogger.error).toHaveBeenCalledWith('[MOCK][ERROR] Error message (ErrorTag)');
    });

    it('should call warn logger for warning logs', () => {
      adapterLogger.warning('Warning message', 'WarningTag');
      expect(mockLogger.warn).toHaveBeenCalledWith('[MOCK][WARNING] Warning message (WarningTag)');
    });

    it('should call warn logger for notice logs', () => {
      adapterLogger.notice('Notice message', 'NoticeTag');
      expect(mockLogger.warn).toHaveBeenCalledWith('[MOCK][NOTICE] Notice message (NoticeTag)');
    });

    it('should call info logger for info logs', () => {
      adapterLogger.info('Info message', 'InfoTag');
      expect(mockLogger.info).toHaveBeenCalledWith('[MOCK][INFO] Info message (InfoTag)');
    });

    it('should call debug logger for debug logs', () => {
      adapterLogger.debug('Debug message', 'DebugTag');
      expect(mockLogger.debug).toHaveBeenCalledWith('[MOCK][DEBUG] Debug message (DebugTag)');
    });

    it('should call debug logger for generic log method', () => {
      adapterLogger.log(LogLevel.WARNING, 'Log message', 'LogTag');
      expect(mockLogger.debug).toHaveBeenCalledWith('[MOCK][WARNING] Log message (LogTag)');
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages and tags', () => {

      vi.spyOn(adapterLogger, 'formatLogOutput').mockRestore();

      adapterLogger.info('', '');
      expect(mockLogger.info).toHaveBeenCalled();

      expect(() => adapterLogger.debug('', '')).not.toThrow();
    });

    it('should handle NONE log level', () => {
      const result = adapterLogger.formatLogOutput(LogLevel.NONE, 'None message', 'Tag');
      expect(result).toContain('None message');

      expect(result).toContain('[NONE]');
    });

    it('should handle ALL log level', () => {
      const result = adapterLogger.formatLogOutput(LogLevel.ALL, 'All message', 'Tag');
      expect(result).toContain('All message');
      expect(result).toContain('[ALL]');
    });
  });
});
