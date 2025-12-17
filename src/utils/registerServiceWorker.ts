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
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.debug('Service Worker registered:', registration.scope)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, notify user
                  logger.debug('New service worker available')
                  // You can dispatch a custom event here to show update notification
                  window.dispatchEvent(new CustomEvent('sw-update-available'))
                }
              })
            }
          })
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

