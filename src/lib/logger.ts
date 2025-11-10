/**
 * Logging utilities for production-safe logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error);
      
      // In production, you might want to send to error tracking service
      // Example: Sentry.captureException(error);
    }
  }

  /**
   * Log API calls in development only
   */
  api(method: string, url: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.log(`[API] ${method} ${url}`, data);
    }
  }

  /**
   * Log navigation events in development only
   */
  navigation(action: string, location: string): void {
    if (this.isDevelopment) {
      console.log(`[Navigation] ${action}: ${location}`);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogLevel };
