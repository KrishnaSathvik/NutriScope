/**
 * Logger Utility
 * Centralized logging with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD

  private log(level: LogLevel, ...args: any[]) {
    // In production, only log errors and warnings
    if (this.isProduction && (level === 'debug' || level === 'info')) {
      return
    }

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    switch (level) {
      case 'debug':
        console.debug(prefix, ...args)
        break
      case 'info':
        console.info(prefix, ...args)
        break
      case 'warn':
        console.warn(prefix, ...args)
        break
      case 'error':
        console.error(prefix, ...args)
        // Send to Sentry if available
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          try {
            ;(window as any).Sentry.captureException(new Error(args.join(' ')))
          } catch (e) {
            // Sentry not available
          }
        }
        break
    }
  }

  debug(...args: any[]) {
    this.log('debug', ...args)
  }

  info(...args: any[]) {
    this.log('info', ...args)
  }

  warn(...args: any[]) {
    this.log('warn', ...args)
  }

  error(...args: any[]) {
    this.log('error', ...args)
  }
}

export const logger = new Logger()
