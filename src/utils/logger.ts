import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ConfigManager from '../config/index.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logDir: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;

  private constructor() {
    const config = ConfigManager.getConfig();
    this.logLevel = this.getLogLevelFromString(config.logging.level);
    this.logDir = path.resolve(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      const sanitizedData = this.sanitizeData(data);
      formattedMessage += ` ${JSON.stringify(sanitizedData, null, 2)}`;
    }

    return formattedMessage;
  }

  private sanitizeData(data: any, visited = new WeakSet(), depth = 0): any {
    // Prevent infinite recursion with depth limit and circular reference detection
    if (depth > 10 || typeof data !== 'object' || data === null) {
      return data;
    }

    // Handle circular references
    if (visited.has(data)) {
      return '[Circular Reference]';
    }

    visited.add(data);

    const sensitiveKeys = ['password', 'token', 'session', 'key', 'secret', 'sessionId', 'notionToken', 'connectionString'];

    try {
      const sanitized: any = Array.isArray(data) ? [] : {};

      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof data[key] === 'object' && data[key] !== null) {
            sanitized[key] = this.sanitizeData(data[key], visited, depth + 1);
          } else {
            sanitized[key] = data[key];
          }
        }
      }

      return sanitized;
    } catch (error) {
      return '[Sanitization Error]';
    } finally {
      visited.delete(data);
    }
  }

  private getLogFilePath(level: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${level.toLowerCase()}-${date}.log`);
  }

  private writeToFile(level: string, message: string): void {
    const logFile = this.getLogFilePath(level);
    const logMessage = this.formatMessage(level, message) + '\n';

    try {
      // Check if log rotation is needed
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxLogSize) {
          this.rotateLogFile(logFile);
        }
      }

      fs.appendFileSync(logFile, logMessage, 'utf8');
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error);
    }
  }

  private rotateLogFile(logFile: string): void {
    try {
      const dir = path.dirname(logFile);
      const ext = path.extname(logFile);
      const basename = path.basename(logFile, ext);

      // Rotate existing files
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${basename}.${i}${ext}`);
        const newFile = path.join(dir, `${basename}.${i + 1}${ext}`);

        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .1
      const rotatedFile = path.join(dir, `${basename}.1${ext}`);
      fs.renameSync(logFile, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  public debug(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      const formattedMessage = data ? `${message} ${JSON.stringify(this.sanitizeData(data), null, 2)}` : message;
      this.writeToFile('DEBUG', formattedMessage);

      // Show on console only when LOG_LEVEL is DEBUG
      if (this.logLevel === LogLevel.DEBUG) {
        console.log(chalk.gray(this.formatMessage('DEBUG', message, data)));
      }
    }
  }

  public info(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      const formattedMessage = data ? `${message} ${JSON.stringify(this.sanitizeData(data), null, 2)}` : message;
      this.writeToFile('INFO', formattedMessage);

      // Show on console only when LOG_LEVEL is DEBUG
      if (this.logLevel === LogLevel.DEBUG) {
        console.log(chalk.blue(this.formatMessage('INFO', message, data)));
      }
    }
  }

  public warn(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      const formattedMessage = data ? `${message} ${JSON.stringify(this.sanitizeData(data), null, 2)}` : message;
      this.writeToFile('WARN', formattedMessage);

      // Show on console only when LOG_LEVEL is DEBUG
      if (this.logLevel === LogLevel.DEBUG) {
        console.warn(chalk.yellow(this.formatMessage('WARN', message, data)));
      }
    }
  }

  public error(message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const errorData = error instanceof Error ? {
        name: error.name,
        stack: error.stack,
        details: error
      } : error;
      const formattedMessage = errorData ? `${message} ${JSON.stringify(this.sanitizeData(errorData), null, 2)}` : message;
      this.writeToFile('ERROR', formattedMessage);

      // Show on console only when LOG_LEVEL is DEBUG
      if (this.logLevel === LogLevel.DEBUG) {
        console.error(chalk.red(this.formatMessage('ERROR', message, errorData)));
      }
    }
  }

  public success(message: string): void {
    // Only show success messages to user, log them as info
    console.log(chalk.green(`✅ ${message}`));
    this.writeToFile('INFO', `SUCCESS: ${message}`);
  }

  public fail(message: string): void {
    // Only show failure messages to user, log them as error
    console.error(chalk.red(`❌ ${message}`));
    this.writeToFile('ERROR', `FAILURE: ${message}`);
  }
}

export default Logger.getInstance();