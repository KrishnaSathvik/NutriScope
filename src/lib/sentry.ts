/**
 * Sentry Error Tracking Configuration
 * 
 * Sentry is enabled automatically if:
 * 1. @sentry/react is installed: npm install @sentry/react
 * 2. VITE_SENTRY_DSN is set in environment variables
 * 
 * If Sentry is not installed or DSN is not set, it will gracefully degrade
 */

// @ts-ignore - Sentry types may not be available in all environments
import * as SentryModule from '@sentry/react'

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  // If DSN is not configured, skip initialization
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.warn('Sentry DSN not configured. Add VITE_SENTRY_DSN to enable error tracking.')
    }
    return
  }

  // Initialize Sentry
  // @ts-ignore - Sentry types may not be available in all environments
  SentryModule.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development',
    integrations: [
      // @ts-ignore
      SentryModule.browserTracingIntegration(),
      // @ts-ignore
      SentryModule.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event: any) {
      // Filter out sensitive data
      if (event.request) {
        // Remove API keys from URLs
        if (event.request.url) {
          event.request.url = event.request.url.replace(/api_key=[^&]+/g, 'api_key=***')
        }
      }
      return event
    },
  })

  // Make Sentry available globally for ErrorBoundary
  // @ts-ignore - Sentry types may not be available in all environments
  window.Sentry = SentryModule
}

// Type declaration for global Sentry (matches ErrorBoundary expectations)
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, options?: any) => void
    }
  }
}
