// Service Worker for NutriScope PWA
const CACHE_NAME = 'nutriscope-v5'
const RUNTIME_CACHE = 'nutriscope-runtime-v5'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
          })
          .map((cacheName) => {
            return caches.delete(cacheName)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Network-first strategy for HTML documents (ensures fresh content)
  if (event.request.destination === 'document' || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Fallback to index.html for navigation requests
            return caches.match('/index.html')
          })
        })
    )
    return
  }

  // Cache-first strategy for static assets (JS, CSS, images, etc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, but also update cache in background
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone()
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, responseToCache)
              })
            }
          })
          .catch(() => {
            // Ignore fetch errors for background updates
          })
        return cachedResponse
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Return offline page if available for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/index.html')
          }
        })
    })
  )
})

// Background sync for offline actions (if needed)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-meals') {
    event.waitUntil(syncMeals())
  }
})

async function syncMeals() {
  // Implement offline meal sync logic here
  console.log('Syncing meals...')
}

