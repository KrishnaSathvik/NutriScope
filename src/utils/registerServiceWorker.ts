import { logger } from './logger'

/**
 * Register Service Worker for PWA functionality
 */
export function registerServiceWorker() {
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

