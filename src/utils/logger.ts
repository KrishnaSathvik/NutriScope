/**
 * Logger Utility
 * Centralized logging with different log levels
 * In production, all console logs are disabled except errors (which go to Sentry)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD
  private enableLogs = import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true' || this.isDevelopment

  private log(level: LogLevel, ...args: any[]) {
    // In production, disable all console logs unless explicitly enabled via env var
    if (this.isProduction && !this.enableLogs) {
      // Only send errors to Sentry in production
      if (level === 'error') {
        // Send to Sentry if available
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          try {
            const errorMessage = args.map(arg => 
              typeof arg === 'string' ? arg : JSON.stringify(arg)
            ).join(' ')
            ;(window as any).Sentry.captureException(new Error(errorMessage))
          } catch (e) {
            // Sentry not available
          }
        }
      }
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
            const errorMessage = args.map(arg => 
              typeof arg === 'string' ? arg : JSON.stringify(arg)
            ).join(' ')
            ;(window as any).Sentry.captureException(new Error(errorMessage))
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

// Export a no-op logger for service worker context
export const createServiceWorkerLogger = () => {
  const isProduction = typeof self !== 'undefined' && 
    (self as any).location?.hostname !== 'localhost' &&
    (self as any).location?.hostname !== '127.0.0.1'
  
  const enableLogs = (self as any).ENABLE_CONSOLE_LOGS === 'true' || !isProduction

  return {
    log: enableLogs ? (...args: any[]) => console.log('[SW]', ...args) : () => {},
    warn: enableLogs ? (...args: any[]) => console.warn('[SW]', ...args) : () => {},
    error: (...args: any[]) => {
      if (enableLogs) {
        console.error('[SW]', ...args)
      }
      // Always send errors to Sentry if available
      if (typeof self !== 'undefined' && (self as any).Sentry) {
        try {
          const errorMessage = args.map(arg => 
            typeof arg === 'string' ? arg : JSON.stringify(arg)
          ).join(' ')
          ;(self as any).Sentry.captureException(new Error(errorMessage))
        } catch (e) {
          // Sentry not available
        }
      }
    },
    debug: enableLogs ? (...args: any[]) => console.debug('[SW]', ...args) : () => {},
  }
}
