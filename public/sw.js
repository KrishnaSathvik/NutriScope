// Service Worker for NutriScope PWA
const CACHE_NAME = 'nutriscope-v8'
const RUNTIME_CACHE = 'nutriscope-runtime-v8'
const REMINDER_CHECK_INTERVAL = 60000 // Check every minute

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

// Reminder storage
const DB_NAME = 'NutriScopeReminders'
const DB_VERSION = 1
const STORE_NAME = 'reminders'
let reminderCheckInterval = null

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches and initialize reminders
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
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
      }),
      // Initialize reminder checking
      Promise.resolve().then(() => {
        initReminderChecking()
      }),
    ]).then(() => {
      self.clients.claim()
    })
  )
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
  } else if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders())
  }
})

async function syncMeals() {
  // Implement offline meal sync logic here
  console.log('Syncing meals...')
}

// Initialize reminder checking
function initReminderChecking() {
  // Check reminders immediately
  checkReminders()
  
  // Then check every minute
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval)
  }
  
  reminderCheckInterval = setInterval(() => {
    checkReminders()
  }, REMINDER_CHECK_INTERVAL)
}

// Check and trigger reminders
async function checkReminders() {
  try {
    const db = await openReminderDB()
    if (!db) return

    const reminders = await getUpcomingReminders(db)
    const now = Date.now()

    for (const reminder of reminders) {
      if (reminder.enabled && reminder.nextTriggerTime <= now) {
        await triggerReminder(reminder, db)
      }
    }
  } catch (error) {
    console.error('[SW] Error checking reminders:', error)
  }
}

// Open IndexedDB for reminders
function openReminderDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[SW] Failed to open reminder DB:', request.error)
      resolve(null)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('nextTriggerTime', 'nextTriggerTime', { unique: false })
        store.createIndex('enabled', 'enabled', { unique: false })
      }
    }
  })
}

// Get upcoming reminders
function getUpcomingReminders(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('nextTriggerTime')
    const maxTime = Date.now() + REMINDER_CHECK_INTERVAL * 2 // Check next 2 minutes
    const range = IDBKeyRange.upperBound(maxTime)
    const request = index.getAll(range)

    request.onsuccess = () => {
      const reminders = (request.result || []).filter(
        (r) => r.enabled && r.nextTriggerTime <= Date.now() + REMINDER_CHECK_INTERVAL
      )
      resolve(reminders)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Trigger a reminder notification
async function triggerReminder(reminder, db) {
  try {
    // Show notification
    const title = reminder.options.title || 'Reminder'
    const options = {
      body: reminder.options.body || '',
      icon: reminder.options.icon || '/favicon.ico',
      badge: reminder.options.badge || '/favicon.ico',
      tag: reminder.options.tag || reminder.id,
      data: reminder.options.data || {},
      requireInteraction: false,
      silent: false,
    }

    await self.registration.showNotification(title, options)

    // Send message to all clients to add notification to UI
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_SHOWN',
        notificationType: reminder.type || 'goal',
        title: title,
        body: options.body,
        url: options.data?.url,
      })
    })

    // Calculate next trigger time
    const nextTriggerTime = calculateNextTriggerTime(reminder)

    // Update reminder in DB
    await updateReminderNextTrigger(db, reminder.id, nextTriggerTime)

    console.log(`[SW] Triggered reminder: ${reminder.id}, next trigger: ${new Date(nextTriggerTime).toLocaleString()}`)
  } catch (error) {
    console.error('[SW] Error triggering reminder:', error)
  }
}

// Calculate next trigger time for a reminder
function calculateNextTriggerTime(reminder) {
  const now = Date.now()
  const currentTime = new Date()

  switch (reminder.type) {
    case 'daily': {
      const [hours, minutes] = reminder.options.data?.time
        ? reminder.options.data.time.split(':').map(Number)
        : [8, 0]

      const nextTrigger = new Date(currentTime)
      nextTrigger.setHours(hours, minutes, 0, 0)

      if (nextTrigger.getTime() <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 1)
      }

      return nextTrigger.getTime()
    }

    case 'weekly': {
      const [hours, minutes] = reminder.options.data?.time
        ? reminder.options.data.time.split(':').map(Number)
        : [8, 0]

      const days = reminder.daysOfWeek || [1, 2, 3, 4, 5]
      const currentDay = currentTime.getDay()

      let daysUntilNext = 7
      for (const day of days) {
        let daysDiff = day - currentDay
        if (daysDiff < 0) daysDiff += 7
        if (daysDiff < daysUntilNext) {
          daysUntilNext = daysDiff
        }
      }

      const nextTrigger = new Date(currentTime)
      nextTrigger.setDate(nextTrigger.getDate() + daysUntilNext)
      nextTrigger.setHours(hours, minutes, 0, 0)

      if (daysUntilNext === 0 && nextTrigger.getTime() <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 7)
      }

      return nextTrigger.getTime()
    }

    case 'recurring': {
      const intervalMs = (reminder.intervalMinutes || 60) * 60 * 1000
      const lastTriggered = reminder.lastTriggered || reminder.scheduledTime
      let nextTrigger = lastTriggered + intervalMs

      if (reminder.startTime && reminder.endTime) {
        const [startHour, startMin] = reminder.startTime.split(':').map(Number)
        const [endHour, endMin] = reminder.endTime.split(':').map(Number)

        const nextTriggerDate = new Date(nextTrigger)
        const triggerHour = nextTriggerDate.getHours()
        const triggerMin = nextTriggerDate.getMinutes()

        if (triggerHour < startHour || (triggerHour === startHour && triggerMin < startMin)) {
          nextTriggerDate.setHours(startHour, startMin, 0, 0)
          nextTrigger = nextTriggerDate.getTime()
        }

        if (triggerHour > endHour || (triggerHour === endHour && triggerMin >= endMin)) {
          nextTriggerDate.setDate(nextTriggerDate.getDate() + 1)
          nextTriggerDate.setHours(startHour, startMin, 0, 0)
          nextTrigger = nextTriggerDate.getTime()
        }
      }

      return nextTrigger
    }

    default:
      return now + 60 * 60 * 1000
  }
}

// Update reminder's next trigger time
function updateReminderNextTrigger(db, id, nextTriggerTime) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const reminder = getRequest.result
      if (!reminder) {
        resolve()
        return
      }

      reminder.nextTriggerTime = nextTriggerTime
      reminder.lastTriggered = Date.now()
      reminder.triggerCount = (reminder.triggerCount || 0) + 1
      reminder.updatedAt = Date.now()

      const putRequest = store.put(reminder)
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// Handle messages from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDERS') {
    // Reschedule reminders
    checkReminders()
    initReminderChecking()
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const url = data.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})


