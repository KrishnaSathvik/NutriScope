import { logger } from './logger'

/**
 * Register Service Worker for PWA functionality
 * Only registers in production to avoid interfering with Vite dev server
 */
export function registerServiceWorker() {
  // Skip service worker registration in development
  const isDevelopment = import.meta.env.DEV || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost')
  
  if (isDevelopment) {
    logger.debug('Service Worker registration skipped in development mode')
    // Unregister any existing service workers in development
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then(() => {
            logger.debug('Unregistered existing service worker for development')
          })
        })
      })
    }
    return
  }

  if ('serviceWorker' in navigator) {
    // First, unregister any redundant service workers
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        // Check if this registration has a redundant worker
        if (registration.installing || registration.waiting) {
          logger.debug('Found redundant service worker, unregistering...')
          registration.unregister().then(() => {
            logger.debug('Unregistered redundant service worker')
          })
        }
      })
    })

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          logger.debug('Service Worker registered:', registration.scope)

          // Force update check immediately
          registration.update()

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  // New service worker available
                  logger.debug('New service worker installed, activating...')
                  // If there's a waiting worker, skip waiting
                  if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
                  }
                  // Reload to activate
                  if (navigator.serviceWorker.controller) {
                    window.location.reload()
                  }
                }
              })
            }
          })

          // Check if there's a waiting worker
          if (registration.waiting) {
            logger.debug('Found waiting service worker, activating...')
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            window.location.reload()
          }
        })
        .catch((error) => {
          logger.error('Service Worker registration failed:', error)
        })
    })

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }
}

