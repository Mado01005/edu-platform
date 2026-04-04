/**
 * Structured logging utility for EduPortal
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: any;
}

class Logger {
  private format(level: LogLevel, message: string, context?: Record<string, any>, error?: any): LogMessage {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
  }

  private print(log: LogMessage) {
    const output = JSON.stringify(log);
    switch (log.level) {
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
      case 'debug':
        console.debug(output);
        break;
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.print(this.format('info', message, context));
  }

  warn(message: string, context?: Record<string, any>, error?: any) {
    this.print(this.format('warn', message, context, error));
  }

  error(message: string, context?: Record<string, any>, error?: any) {
    this.print(this.format('error', message, context, error));
  }

  debug(message: string, context?: Record<string, any>) {
    // Only log debug in development
    if (process.env.NODE_ENV === 'development') {
      this.print(this.format('debug', message, context));
    }
  }
}

export const logger = new Logger();
