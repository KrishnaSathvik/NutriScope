/**
 * Production-safe logger utility
 * 
 * In development: Logs to console
 * In production: Only logs errors (to console and Sentry)
 */

const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD

interface Logger {
  log: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
}

export const logger: Logger = {
  /**
   * Log informational messages (dev only)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Log warnings (dev only)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Log errors (always logged, sent to Sentry in production)
   */
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args)
    
    // Send to Sentry in production if available
    if (isProd && typeof window !== 'undefined' && window.Sentry) {
      try {
        const error = args[0] instanceof Error ? args[0] : new Error(String(args[0]))
        window.Sentry.captureException(error, {
          extra: args.slice(1),
        })
      } catch (e) {
        // Fail silently if Sentry fails
      }
    }
  },

  /**
   * Debug messages (dev only)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args)
    }
  },

  /**
   * Info messages (dev only)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  },
}

// Type declaration for Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, options?: any) => void
    }
  }
}

