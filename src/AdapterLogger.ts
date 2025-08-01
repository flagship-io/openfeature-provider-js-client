import { IFlagshipLogManager, LogLevel } from '@flagship.io/js-sdk';
import { Logger } from '@openfeature/web-sdk';

export class AdapterLogger implements IFlagshipLogManager {
  private _logger: Logger;
  constructor(logger: Logger) {
    this._logger = logger;
  }

  formatLogOutput(level: LogLevel, message: string, tag: string): string {
    const now = new Date();

    const formatTwoDigits = (value: number): string => {
      return value.toString().padStart(2, '0');
    };

    const formatMilliseconds = (value: number): string => {
      return value.toString().padStart(3, '0');
    };

    const colorCodes: Record<LogLevel, string> = {
      [LogLevel.EMERGENCY]: '\x1b[1;37;41m',
      [LogLevel.ALERT]: '\x1b[1;37;45m',
      [LogLevel.CRITICAL]: '\x1b[1;37;41m',
      [LogLevel.ERROR]: '\x1b[1;37;41m',
      [LogLevel.WARNING]: '\x1b[33;1m',
      [LogLevel.NOTICE]: '\x1b[36;1m',
      [LogLevel.INFO]: '\x1b[32;1m',
      [LogLevel.DEBUG]: '\x1b[90;1m',
      [LogLevel.NONE]: '',
      [LogLevel.ALL]: '\x1b[90;1m'
    };

    const resetColor = '\x1b[0m';
    const colorCode = colorCodes[level] || '';

    const year = now.getFullYear();
    const month = formatTwoDigits(now.getMonth() + 1);
    const day = formatTwoDigits(now.getDate());
    const hours = formatTwoDigits(now.getHours());
    const minutes = formatTwoDigits(now.getMinutes());
    const seconds = formatTwoDigits(now.getSeconds());
    const milliseconds = formatMilliseconds(now.getMilliseconds());

    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;

    const levelName = LogLevel[level].padEnd(2);

    return `${colorCode}[${timestamp}] [Flagship SDK] [${levelName}] [${tag}] ${message}${resetColor}`;
  }

  emergency(message: string, tag: string): void {
    this._logger.error(this.formatLogOutput(LogLevel.EMERGENCY, message, tag));
  }
  alert(message: string, tag: string): void {
    this._logger.error(this.formatLogOutput(LogLevel.ALERT, message, tag));
  }
  critical(message: string, tag: string): void {
    this._logger.error(this.formatLogOutput(LogLevel.CRITICAL, message, tag));
  }
  error(message: string, tag: string): void {
    this._logger.error(this.formatLogOutput(LogLevel.ERROR, message, tag));
  }
  warning(message: string, tag: string): void {
    this._logger.warn(this.formatLogOutput(LogLevel.WARNING, message, tag));
  }
  notice(message: string, tag: string): void {
    this._logger.warn(this.formatLogOutput(LogLevel.NOTICE, message, tag));
  }
  info(message: string, tag: string): void {
    this._logger.info(this.formatLogOutput(LogLevel.INFO, message, tag));
  }
  debug(message: string, tag: string): void {
    this._logger.debug(this.formatLogOutput(LogLevel.DEBUG, message, tag));
  }
  log(level: LogLevel, message: string, tag: string): void {
    this._logger.debug(this.formatLogOutput(level, message, tag));
  }
}
