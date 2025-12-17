// Service Worker for NutriScope PWA
const CACHE_NAME = 'nutriscope-v11'
const RUNTIME_CACHE = 'nutriscope-runtime-v11'
const REMINDER_CHECK_INTERVAL = 30000 // Check every 30 seconds for more accurate timing
const SW_VERSION = 'v11-fixed-30min-window'

console.log(`[SW] Service Worker ${SW_VERSION} loading...`)

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

// Reminder storage (legacy IndexedDB - kept for backward compatibility)
const DB_NAME = 'NutriScopeReminders'
const DB_VERSION = 1
const STORE_NAME = 'reminders'
let reminderCheckInterval = null

// Supabase configuration (will be set from main app)
let SUPABASE_URL = null
let SUPABASE_ANON_KEY = null
let currentUserId = null
let currentAccessToken = null

// Track recently triggered reminders to prevent duplicates
// Key: reminderId, Value: timestamp when triggered
const recentlyTriggeredReminders = new Map()
const TRIGGER_COOLDOWN_MS = 60000 // 1 minute cooldown to prevent duplicates

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
  console.log(`[SW] Service worker ${SW_VERSION} activating...`)
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
      // CRITICAL: Claim clients immediately so we can receive messages
      self.clients.claim().then(() => {
        console.log('[SW] ✅ Service worker claimed all clients')
        return self.clients.matchAll().then(clients => {
          console.log(`[SW] Controlling ${clients.length} client(s)`)
        })
      }),
      // Initialize reminder checking (but only if Supabase is configured)
      Promise.resolve().then(() => {
        console.log('[SW] Checking if reminder checking should be initialized...')
        if (currentUserId && currentAccessToken) {
          console.log('[SW] Supabase config already available, initializing reminder checking...')
          initReminderChecking()
        } else {
          console.log('[SW] ⏳ Waiting for Supabase config before initializing reminder checking...')
          console.log('[SW] Reminder checking will start after SET_SUPABASE_CONFIG message is received')
        }
      }),
    ]).then(() => {
      console.log(`[SW] ✅ Service worker ${SW_VERSION} activated and ready`)
      // Force immediate activation
      return self.clients.claim()
    })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
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
  // Clear any existing interval
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval)
    reminderCheckInterval = null
  }
  
  // Check reminders immediately
  checkReminders()
  
  // Then check every 30 seconds for more accurate timing
  reminderCheckInterval = setInterval(() => {
    checkReminders()
  }, REMINDER_CHECK_INTERVAL)
  
  console.log('[SW] ✅ Reminder checking initialized (interval: 30s)')
}

// Fetch reminders from Supabase
async function fetchRemindersFromSupabase(userId, accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId || !accessToken) {
    console.log('[SW] ⚠️ Supabase not configured or user not authenticated')
    console.log(`[SW]   - SUPABASE_URL: ${SUPABASE_URL ? 'set' : 'NOT SET'}`)
    console.log(`[SW]   - SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'set' : 'NOT SET'}`)
    console.log(`[SW]   - userId: ${userId ? 'set' : 'NOT SET'}`)
    console.log(`[SW]   - accessToken: ${accessToken ? 'set' : 'NOT SET'}`)
    return null
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/rpc/get_upcoming_reminders`
    console.log(`[SW] 📡 Fetching reminders from: ${url}`)
    console.log(`[SW] 📡 Request body:`, JSON.stringify({
      p_user_id: userId,
      p_window_minutes: 30,
    }))
    
    console.log('[SW] 📡 Starting fetch request...')
    
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          p_user_id: userId,
          p_window_minutes: 30, // Increased window to catch overdue reminders (30 minutes past and 30 minutes future)
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      console.log(`[SW] 📡 Fetch response received: status=${response.status}, ok=${response.ok}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SW] ❌ Error fetching reminders from Supabase:', response.status, response.statusText)
        console.error('[SW] ❌ Error details:', errorText)
        return null
      }

      const reminders = await response.json()
      console.log(`[SW] ✅ Fetched ${reminders.length} reminders from Supabase`)
      console.log(`[SW] 📋 Reminders data:`, JSON.stringify(reminders, null, 2))
      if (reminders.length > 0) {
        reminders.forEach(r => {
          const triggerTime = r.next_trigger_time ? new Date(r.next_trigger_time).toLocaleString() : 'unknown'
          const now = new Date()
          const triggerDate = r.next_trigger_time ? new Date(r.next_trigger_time) : null
          const timeUntil = triggerDate ? triggerDate.getTime() - now.getTime() : null
          const minutesUntil = timeUntil ? Math.round(timeUntil / 1000 / 60) : null
          console.log(`[SW]   - ${r.id}: ${r.title} at ${triggerTime} (${minutesUntil !== null ? `${minutesUntil}m` : 'unknown'} until trigger)`)
        })
      } else {
        console.log('[SW] ℹ️ No reminders found in the upcoming window (30 minutes past to 30 minutes future)')
      }
      return reminders
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.error('[SW] ❌ Fetch timeout - request took too long')
      } else {
        console.error('[SW] ❌ Error fetching reminders from Supabase:', fetchError)
        console.error('[SW] Error stack:', fetchError.stack)
      }
      return null
    }
  } catch (error) {
    console.error('[SW] ❌ Error in fetchRemindersFromSupabase:', error)
    console.error('[SW] Error stack:', error.stack)
    return null
  }
}

// Update reminder in Supabase after triggering
async function updateReminderInSupabase(reminderId, nextTriggerTime, currentTriggerCount, accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !accessToken) {
    return false
  }

  try {
    // Ensure nextTriggerTime is a Date object
    const nextTriggerDate = nextTriggerTime instanceof Date 
      ? nextTriggerTime 
      : new Date(nextTriggerTime)
    
    if (isNaN(nextTriggerDate.getTime())) {
      console.error(`[SW] ❌ Invalid date for reminder ${reminderId}: ${nextTriggerTime}`)
      return false
    }
    
    const url = `${SUPABASE_URL}/rest/v1/reminders?id=eq.${encodeURIComponent(reminderId)}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        last_triggered: new Date().toISOString(),
        next_trigger_time: nextTriggerDate.toISOString(),
        trigger_count: currentTriggerCount + 1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[SW] ❌ Error updating reminder in Supabase:', response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('[SW] ❌ Error updating reminder in Supabase:', error)
    return false
  }
}

// Calculate next trigger time for a reminder (same logic as SupabaseReminderService)
function calculateNextTriggerTime(reminder, currentTime = new Date()) {
  const now = currentTime.getTime()
  
  // Handle both JSONB data (from Supabase) and regular objects
  const reminderData = typeof reminder.data === 'string' ? JSON.parse(reminder.data) : reminder.data

  switch (reminder.reminder_type) {
    case 'daily': {
      const time = reminderData?.time || '08:00'
      const [hours, minutes] = time.split(':').map(Number)
      const nextTrigger = new Date(currentTime)
      nextTrigger.setHours(hours, minutes, 0, 0)

      if (nextTrigger.getTime() <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 1)
      }

      return nextTrigger
    }

    case 'weekly': {
      const time = reminderData?.time || '08:00'
      const [hours, minutes] = time.split(':').map(Number)
      const days = reminder.days_of_week || [1, 2, 3, 4, 5]
      
      const allDaysSelected = days.length === 7 && days.every(d => [0,1,2,3,4,5,6].includes(d))
      
      if (allDaysSelected) {
        const nextTrigger = new Date(currentTime)
        nextTrigger.setHours(hours, minutes, 0, 0)
        
        if (nextTrigger.getTime() <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 1)
        }
        
        return nextTrigger
      }

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
        const sortedDays = [...days].sort((a, b) => a - b)
        let nextDayIndex = sortedDays.findIndex(d => d > currentDay)
        if (nextDayIndex === -1) nextDayIndex = 0
        const nextDay = sortedDays[nextDayIndex]
        
        let daysToAdd = nextDay - currentDay
        if (daysToAdd <= 0) daysToAdd += 7
        
        nextTrigger.setDate(nextTrigger.getDate() + daysToAdd)
      }

      return nextTrigger
    }

    case 'recurring': {
      if (!reminder.interval_minutes || !reminder.start_time || !reminder.end_time) {
        return new Date(now + 60 * 60 * 1000)
      }

      const [startHour, startMin] = reminder.start_time.split(':').map(Number)
      const [endHour, endMin] = reminder.end_time.split(':').map(Number)
      
      const startTimeToday = new Date(currentTime)
      startTimeToday.setHours(startHour, startMin, 0, 0)
      
      const intervalMs = reminder.interval_minutes * 60 * 1000
      let initialTriggerTime = startTimeToday.getTime()
      
      if (initialTriggerTime <= now) {
        const timeSinceStart = now - initialTriggerTime
        const intervalsPassed = Math.floor(timeSinceStart / intervalMs)
        const nextIntervalTime = initialTriggerTime + ((intervalsPassed + 1) * intervalMs)
        
        // If we're within 30 seconds of the current interval boundary, use that instead
        const currentIntervalTime = initialTriggerTime + (intervalsPassed * intervalMs)
        const timeUntilCurrentInterval = currentIntervalTime - now
        
        if (timeUntilCurrentInterval >= -30000 && timeUntilCurrentInterval <= 30000) {
          initialTriggerTime = currentIntervalTime
        } else {
          initialTriggerTime = nextIntervalTime
        }
        
        const endTimeToday = new Date(currentTime)
        endTimeToday.setHours(endHour, endMin, 0, 0)
        
        if (initialTriggerTime > endTimeToday.getTime()) {
          startTimeToday.setDate(startTimeToday.getDate() + 1)
          initialTriggerTime = startTimeToday.getTime()
        }
      }

      return new Date(initialTriggerTime)
    }

    default:
      return new Date(now + 60 * 60 * 1000)
  }
}

// Check and trigger reminders
async function checkReminders() {
  try {
    // Check notification permission status
    try {
      const registration = self.registration
      if (registration) {
        const notifications = await registration.getNotifications()
        console.log(`[SW] Current notification permission check: ${notifications.length} active notifications`)
      }
    } catch (permError) {
      console.warn('[SW] Could not check notification permission:', permError)
    }
    
    // Try Supabase first, fall back to IndexedDB
    let reminders = null
    
    if (currentUserId && currentAccessToken) {
      console.log(`[SW] 🔍 Checking reminders from Supabase for user ${currentUserId}`)
      console.log(`[SW] Supabase URL: ${SUPABASE_URL ? 'configured' : 'NOT SET'}`)
      console.log(`[SW] Access token: ${currentAccessToken ? 'present' : 'missing'}`)
      reminders = await fetchRemindersFromSupabase(currentUserId, currentAccessToken)
    } else {
      console.log(`[SW] ⚠️ Cannot fetch from Supabase - userId: ${currentUserId ? 'set' : 'NOT SET'}, accessToken: ${currentAccessToken ? 'set' : 'NOT SET'}`)
      console.log(`[SW] ⚠️ Waiting for SET_SUPABASE_CONFIG message from main app...`)
    }
    
    // Fallback to IndexedDB only if Supabase fetch failed (not if it returned empty array)
    // Empty array means no reminders in the window, which is valid
    if (reminders === null) {
      // Supabase fetch failed, try IndexedDB fallback
      console.log('[SW] Supabase fetch failed, falling back to IndexedDB for reminders')
      const db = await openReminderDB()
      if (!db) {
        console.log('[SW] No reminder DB available')
        return
      }
      reminders = await getUpcomingReminders(db)
    }
    
    if (!reminders || reminders.length === 0) {
      // This is normal if no reminders are scheduled in the current window
      console.log('[SW] ℹ️ No reminders found in the current time window (30 minutes past to 30 minutes future)')
      return
    }

    const now = Date.now()
    console.log(`[SW] Checking ${reminders.length} reminders at ${new Date(now).toLocaleString()}`)

    for (const reminder of reminders) {
      // Handle both Supabase and IndexedDB formats
      const nextTriggerTime = reminder.next_trigger_time 
        ? new Date(reminder.next_trigger_time).getTime() 
        : reminder.nextTriggerTime
      const reminderId = reminder.id
      const enabled = reminder.enabled !== false
      
      const timeUntilTrigger = nextTriggerTime - now
      const secondsUntil = Math.round(timeUntilTrigger / 1000)
      const minutesUntil = Math.round(timeUntilTrigger / 1000 / 60)
      const isOverdue = timeUntilTrigger < 0

      // Log each reminder being checked
      console.log(`[SW] Checking reminder ${reminderId}: enabled=${enabled}, nextTrigger=${new Date(nextTriggerTime).toLocaleString()}, timeUntil=${minutesUntil}m (${secondsUntil}s), overdue=${isOverdue}`)

      // Trigger if reminder time has passed or is within the next 30 seconds
      // Also catch reminders that are up to 30 minutes overdue (in case we missed them)
      if (enabled && nextTriggerTime <= now + 30000 && nextTriggerTime >= now - (30 * 60 * 1000)) {
        // Check if this reminder was recently triggered to prevent duplicates
        const lastTriggered = recentlyTriggeredReminders.get(reminderId)
        const timeSinceLastTrigger = lastTriggered ? now - lastTriggered : Infinity
        
        if (lastTriggered && timeSinceLastTrigger < TRIGGER_COOLDOWN_MS) {
          console.log(`[SW] ⏭️ Skipping duplicate trigger for ${reminderId} (triggered ${Math.round(timeSinceLastTrigger / 1000)}s ago)`)
          continue // Skip this reminder - already triggered recently
        }
        
        // Mark as triggered immediately to prevent race conditions
        recentlyTriggeredReminders.set(reminderId, now)
        
        // Clean up old entries (older than cooldown period)
        for (const [id, timestamp] of recentlyTriggeredReminders.entries()) {
          if (now - timestamp > TRIGGER_COOLDOWN_MS * 2) {
            recentlyTriggeredReminders.delete(id)
          }
        }
        
        console.log(`[SW] 🔔 Triggering reminder: ${reminderId} at ${new Date(nextTriggerTime).toLocaleString()}`)
        console.log(`[SW] Time until trigger: ${secondsUntil} seconds ${isOverdue ? '(OVERDUE)' : ''}`)
        
        // Prepare notification data
        const title = reminder.title || reminder.options?.title || 'Reminder'
        const body = reminder.body || reminder.options?.body || ''
        const tag = reminder.tag || reminder.options?.tag || reminderId
        const data = reminder.data || reminder.options?.data || {}
        
        console.log(`[SW] 📋 Preparing to show notification: ${title}`)
        
        // Update reminder in Supabase FIRST to prevent duplicate triggers
        // This ensures the next_trigger_time is updated before showing notification
        let updateSuccess = false
        if (reminder.next_trigger_time) {
          // Supabase reminder - calculate next trigger and update BEFORE showing notification
          try {
            const nextTrigger = calculateNextTriggerTime(reminder, new Date())
            // Ensure nextTrigger is a Date object
            const nextTriggerDate = nextTrigger instanceof Date ? nextTrigger : new Date(nextTrigger)
            const triggerCount = reminder.trigger_count || 0
            console.log(`[SW] Updating reminder ${reminderId} in Supabase - next trigger: ${nextTriggerDate.toLocaleString()}`)
            console.log(`[SW] Next trigger date type: ${typeof nextTriggerDate}, is Date: ${nextTriggerDate instanceof Date}`)
            updateSuccess = await updateReminderInSupabase(reminderId, nextTriggerDate, triggerCount, currentAccessToken)
            if (updateSuccess) {
              console.log(`[SW] ✅ Successfully updated reminder ${reminderId} in Supabase`)
            } else {
              console.error(`[SW] ❌ Failed to update reminder ${reminderId} in Supabase`)
              // Remove from recently triggered if update failed so it can retry
              recentlyTriggeredReminders.delete(reminderId)
              continue // Skip showing notification if update failed
            }
          } catch (error) {
            console.error(`[SW] ❌ Error calculating/updating next trigger for reminder ${reminderId}:`, error)
            // Remove from recently triggered if update failed so it can retry
            recentlyTriggeredReminders.delete(reminderId)
            continue // Skip showing notification if update failed
          }
        } else {
          // IndexedDB reminder - update before showing notification
          const db = await openReminderDB()
          if (db) {
            try {
              await triggerReminder(reminder, db)
              updateSuccess = true
            } catch (error) {
              console.error(`[SW] ❌ Error updating IndexedDB reminder:`, error)
              recentlyTriggeredReminders.delete(reminderId)
              continue
            }
          }
        }
        
        // Only show notification if update was successful
        if (!updateSuccess) {
          console.warn(`[SW] ⚠️ Skipping notification - reminder update failed`)
          continue
        }
        
        try {
          await self.registration.showNotification(title, {
            body,
            icon: reminder.icon || reminder.options?.icon || '/favicon.ico',
            badge: reminder.badge || reminder.options?.badge || '/favicon.ico',
            tag,
            data,
            requireInteraction: true, // Keep notification visible until user interacts
            vibrate: [200, 100, 200],
            silent: false,
          })
          
          // Verify notification was shown
          await new Promise(resolve => setTimeout(resolve, 100))
          const allNotifications = await self.registration.getNotifications()
          const matchingNotifications = allNotifications.filter(n => n.tag === tag)
          
          if (matchingNotifications.length > 0) {
            console.log(`[SW] ✅ Notification shown and verified: ${title}`)
            console.log(`[SW] 📊 Total active notifications: ${allNotifications.length}`)
          } else {
            console.warn(`[SW] ⚠️ Notification API succeeded but notification not found`)
            console.warn(`[SW] 💡 This usually means browser/OS is blocking notifications`)
            console.warn(`[SW] 💡 Check: Browser settings → Notifications → Site settings`)
            console.warn(`[SW] 💡 Check: System notification center (bell icon in address bar)`)
          }
        } catch (error) {
          console.error(`[SW] ❌ Failed to show notification:`, error)
          console.error(`[SW] Error details:`, error.message)
          console.warn(`[SW] 💡 Notification permission may be denied. Check browser settings.`)
        }
        
        const messageData = {
          type: 'NOTIFICATION_SHOWN',
          notificationType: reminder.type || 'goal',
          title: title,
          body: body,
          url: data?.url || '/dashboard',
        }
        
        console.log(`[SW] Message data:`, JSON.stringify(messageData, null, 2))
        
        // Try multiple methods to send notification to UI
        // Method 1: Direct client postMessage (works when SW controls the page)
        const clients = await self.clients.matchAll({ 
          includeUncontrolled: true, 
          type: 'window' 
        })
        console.log(`[SW] 📤 Found ${clients.length} client(s) via matchAll`)
        console.log(`[SW] Client URLs:`, clients.map(c => c.url))
        
        let messageSent = false
        
        if (clients.length > 0) {
          clients.forEach((client, index) => {
            try {
              client.postMessage(messageData)
              console.log(`[SW] ✅ Message sent to client ${index + 1}/${clients.length} (${client.url})`)
              messageSent = true
            } catch (error) {
              console.error(`[SW] ❌ Failed to send message to client ${index + 1}:`, error)
            }
          })
        }
        
        // Method 2: BroadcastChannel (works even when SW doesn't control the page)
        try {
          const channel = new BroadcastChannel('nutriscope-notifications')
          channel.postMessage(messageData)
          console.log(`[SW] ✅ Message sent via BroadcastChannel`)
          channel.close()
          messageSent = true
        } catch (error) {
          console.warn(`[SW] ⚠️ BroadcastChannel not available:`, error)
        }
        
        // Method 3: Store in localStorage as fallback (main app can poll)
        if (!messageSent) {
          console.warn(`[SW] ⚠️ No clients found and BroadcastChannel failed!`)
          console.warn(`[SW] 💡 Notification will still appear in browser notification center`)
          console.warn(`[SW] 💡 Try: Hard refresh (Ctrl+Shift+R) or check service worker registration`)
        }
      } else if (enabled) {
        console.log(`[SW] ⏰ Reminder ${reminderId} scheduled for ${new Date(nextTriggerTime).toLocaleString()} (in ${Math.round(timeUntilTrigger / 1000 / 60)} minutes, ${secondsUntil}s)`)
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

// Get ALL reminders (for debugging)
function getAllReminders(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      console.log(`[SW] Total reminders in DB: ${request.result?.length || 0}`)
      if (request.result && request.result.length > 0) {
        request.result.forEach(r => {
          console.log(`[SW] Reminder: ${r.id}, enabled: ${r.enabled}, nextTrigger: ${new Date(r.nextTriggerTime).toLocaleString()}, userId: ${r.userId}`)
        })
      }
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Get upcoming reminders
function getUpcomingReminders(db) {
  return new Promise((resolve, reject) => {
    // CRITICAL: IndexedDB IS shared between main thread and service worker!
    // So we can read reminders directly from IndexedDB without postMessage
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    // First, get ALL reminders to see what's in the DB
    const getAllRequest = store.getAll()
    
    getAllRequest.onsuccess = () => {
      const allReminders = getAllRequest.result || []
      console.log(`[SW] 📊 Total reminders in IndexedDB: ${allReminders.length}`)
      
      if (allReminders.length > 0) {
        console.log('[SW] 📋 All reminders in DB:')
        allReminders.forEach((r, i) => {
          console.log(`[SW]   ${i + 1}. ${r.id}: ${r.options?.title || 'no title'}, enabled: ${r.enabled}, nextTrigger: ${new Date(r.nextTriggerTime).toLocaleString()}, userId: ${r.userId}`)
        })
      }
      
      // Now filter for upcoming reminders
      const now = Date.now()
      // CRITICAL: Use the same time window as Supabase (±30 minutes) to catch overdue reminders
      // Check reminders that should have triggered in the last 30 minutes (to catch missed ones)
      // and reminders that will trigger in the next 30 minutes
      const pastWindow = now - (30 * 60 * 1000) // 30 minutes ago
      const futureWindow = now + (30 * 60 * 1000) // 30 minutes from now
      
      // Filter all reminders to find ones that should trigger
      const reminders = allReminders.filter((r) => {
        if (!r.enabled) return false
        
        // Check if reminder should trigger (within 30 minutes before or after now)
        // This matches the Supabase get_upcoming_reminders function behavior
        const shouldTrigger = r.nextTriggerTime >= pastWindow && r.nextTriggerTime <= futureWindow
        
        if (shouldTrigger) {
          const timeUntil = r.nextTriggerTime - now
          const minutesUntil = Math.round(timeUntil / 1000 / 60)
          const secondsUntil = Math.round(timeUntil / 1000)
          const isOverdue = timeUntil < 0
          console.log(`[SW] 🎯 Reminder ${r.id}: nextTriggerTime=${new Date(r.nextTriggerTime).toLocaleString()}, now=${new Date(now).toLocaleString()}, timeUntil=${secondsUntil}s (${minutesUntil}m) ${isOverdue ? 'OVERDUE' : ''}`)
        }
        
        return shouldTrigger
      })
      
      console.log(`[SW] ✅ Found ${reminders.length} reminders to check out of ${allReminders.length} total (using ±30 minute window) [SW Version: ${SW_VERSION}]`)
      
      if (reminders.length > 0) {
        reminders.forEach(r => {
          const timeUntil = r.nextTriggerTime - now
          const secondsUntil = Math.round(timeUntil / 1000)
          const minutesUntil = Math.round(timeUntil / 1000 / 60)
          const isOverdue = timeUntil < 0
          console.log(`[SW] 🎯 Will trigger: ${r.id} (${r.options?.title || 'no title'}) in ${secondsUntil}s (${minutesUntil}m) ${isOverdue ? 'OVERDUE' : ''}`)
        })
      } else if (allReminders.length > 0) {
        console.log(`[SW] ℹ️ No reminders in time window (±30 minutes), but ${allReminders.length} reminders exist in DB [SW Version: ${SW_VERSION}]`)
        // Show next trigger times for debugging
        allReminders.forEach(r => {
          const timeUntil = r.nextTriggerTime - now
          const minutesUntil = Math.round(timeUntil / 1000 / 60)
          const secondsUntil = Math.round(timeUntil / 1000)
          const isOverdue = timeUntil < 0
          console.log(`[SW]   - ${r.id}: triggers in ${secondsUntil}s (${minutesUntil}m) ${isOverdue ? 'OVERDUE' : ''} - ${new Date(r.nextTriggerTime).toLocaleString()}`)
        })
      }
      
      resolve(reminders)
    }

    getAllRequest.onerror = () => {
      reject(getAllRequest.error)
    }
  })
}

// Trigger a reminder notification
async function triggerReminder(reminder, db) {
  try {
    const title = reminder.options.title || 'Reminder'
    const options = {
      ...reminder.options,
      body: reminder.options.body || '',
      icon: reminder.options.icon || '/favicon.svg',
      badge: reminder.options.badge || '/favicon.svg',
      tag: reminder.id,
      requireInteraction: true, // Keep notification until user dismisses
      vibrate: [200, 100, 200], // Vibration pattern
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: {
        reminderId: reminder.id,
        url: reminder.options.url || '/dashboard',
      },
    }
    
    console.log(`[SW] 🔔 Attempting to show notification: ${title}`)
    console.log(`[SW] Service worker registration available: ${!!self.registration}`)
    console.log(`[SW] Notification options:`, JSON.stringify(options, null, 2))

    try {
      // Show the notification
      await self.registration.showNotification(title, options)
      console.log(`[SW] ✅ Notification API call succeeded: ${title}`)
      
      // Verify notification was actually shown by checking if it exists
      await new Promise(resolve => setTimeout(resolve, 200)) // Delay to ensure notification is registered
      const allNotifications = await self.registration.getNotifications()
      const matchingNotifications = allNotifications.filter(n => n.tag === options.tag)
      
      console.log(`[SW] 📊 Total active notifications: ${allNotifications.length}`)
      console.log(`[SW] 📊 Matching notifications (tag: ${options.tag}): ${matchingNotifications.length}`)
      
      if (matchingNotifications.length > 0) {
        console.log(`[SW] ✅ Notification confirmed visible: ${title}`)
        matchingNotifications.forEach(n => {
          console.log(`[SW]   - Title: ${n.title}, Body: ${n.body}, Tag: ${n.tag}`)
        })
      } else {
        console.warn(`[SW] ⚠️ Notification API succeeded but notification not found in list`)
        console.warn(`[SW] ⚠️ This usually means the browser/OS is blocking notifications`)
        console.warn(`[SW] 💡 Check: Browser settings → Notifications → Site settings`)
        console.warn(`[SW] 💡 Check: OS Do Not Disturb / Focus mode`)
        console.warn(`[SW] 💡 Check: Browser notification center (click bell icon in address bar)`)
        
        // Notify client about potential blocking
        const clients = await self.clients.matchAll()
        clients.forEach(client => {
          client.postMessage({
            type: 'NOTIFICATION_BLOCKED',
            reminderId: reminder.id,
            title: title,
            message: 'Notification was triggered but may be blocked by browser/OS settings',
          })
        })
      }
    } catch (error) {
      // If notification fails (e.g., permission denied), log but don't throw
      console.error('[SW] ❌ Failed to show notification:', error)
      console.error('[SW] Error details:', error.message, error.stack)
      // Notify client to request permission
      const clients = await self.clients.matchAll()
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_PERMISSION_DENIED',
          reminderId: reminder.id,
          error: error.message,
        })
      })
      return // Don't update reminder if notification failed
    }

    // Send message to all clients to add notification to UI
    const clients = await self.clients.matchAll()
    console.log(`[SW] 📤 Sending NOTIFICATION_SHOWN to ${clients.length} client(s)`)
    
    const messageData = {
      type: 'NOTIFICATION_SHOWN',
      notificationType: reminder.type || 'goal',
      title: title,
      body: options.body,
      url: options.data?.url,
    }
    
    console.log(`[SW] Message data:`, JSON.stringify(messageData, null, 2))
    
    clients.forEach((client, index) => {
      try {
        client.postMessage(messageData)
        console.log(`[SW] ✅ Message sent to client ${index + 1}/${clients.length}`)
      } catch (error) {
        console.error(`[SW] ❌ Failed to send message to client ${index + 1}:`, error)
      }
    })

    // Calculate next trigger time
    const nextTriggerTime = calculateNextTriggerTimeForIndexedDB(reminder)

    // Update reminder in DB
    await updateReminderNextTrigger(db, reminder.id, nextTriggerTime)

    console.log(`[SW] Triggered reminder: ${reminder.id}, next trigger: ${new Date(nextTriggerTime).toLocaleString()}`)
  } catch (error) {
    console.error('[SW] Error triggering reminder:', error)
  }
}

// Calculate next trigger time for IndexedDB reminders (returns timestamp number)
function calculateNextTriggerTimeForIndexedDB(reminder) {
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
      
      // CRITICAL: If all 7 days are selected, treat as daily reminder
      const allDaysSelected = days && days.length === 7 && days.every(d => [0,1,2,3,4,5,6].includes(d))
      
      if (allDaysSelected) {
        // Treat as daily - schedule for tomorrow if time passed today
        const nextTrigger = new Date(currentTime)
        nextTrigger.setHours(hours, minutes, 0, 0)
        
        if (nextTrigger.getTime() <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 1)
        }
        
        return nextTrigger.getTime()
      }
      
      // Regular weekly logic
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

      // If same day but time passed, find next day in the array (not necessarily next week)
      if (daysUntilNext === 0 && nextTrigger.getTime() <= now) {
        // Find the next day in the array
        const sortedDays = [...days].sort((a, b) => a - b)
        let nextDayIndex = sortedDays.findIndex(d => d > currentDay)
        if (nextDayIndex === -1) nextDayIndex = 0 // Wrap around to first day
        const nextDay = sortedDays[nextDayIndex]
        
        let daysToAdd = nextDay - currentDay
        if (daysToAdd <= 0) daysToAdd += 7
        
        nextTrigger.setDate(nextTrigger.getDate() + daysToAdd)
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

// Save reminders to IndexedDB (service worker context)
async function saveRemindersToSW(reminders) {
  console.log(`[SW] saveRemindersToSW called with ${reminders?.length || 0} reminders`)
  
  if (!reminders || reminders.length === 0) {
    console.warn('[SW] ⚠️ No reminders provided to save')
    return
  }
  
  console.log('[SW] Sample reminder:', reminders[0] ? {
    id: reminders[0].id,
    title: reminders[0].options?.title,
    nextTriggerTime: new Date(reminders[0].nextTriggerTime).toLocaleString(),
    enabled: reminders[0].enabled
  } : 'none')
  
  const db = await openReminderDB()
  if (!db) {
    console.error('[SW] ❌ Cannot save reminders - DB not available')
    return
  }
  
  console.log('[SW] ✅ Database opened successfully')

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    let saved = 0
    let errors = []

    console.log(`[SW] Starting transaction to save ${reminders.length} reminders`)

    reminders.forEach((reminder, index) => {
      console.log(`[SW] Saving reminder ${index + 1}/${reminders.length}: ${reminder.id}`)
      const request = store.put(reminder)
      
      request.onsuccess = () => {
        saved++
        console.log(`[SW] ✅ Saved reminder ${saved}/${reminders.length}: ${reminder.id} (${reminder.options?.title || 'no title'})`)
        if (saved === reminders.length) {
          console.log(`[SW] ✅ All ${saved} reminders saved successfully`)
          resolve()
        }
      }
      
      request.onerror = () => {
        const error = request.error
        errors.push({ reminderId: reminder.id, error })
        console.error(`[SW] ❌ Failed to save reminder ${reminder.id}:`, error)
        if (errors.length === reminders.length) {
          reject(new Error(`Failed to save all reminders: ${errors.map(e => e.error.message).join(', ')}`))
        }
      }
    })

    transaction.oncomplete = () => {
      console.log(`[SW] ✅ Transaction completed: ${saved}/${reminders.length} reminders saved`)
      if (saved === reminders.length) {
        resolve()
      } else {
        reject(new Error(`Only saved ${saved} out of ${reminders.length} reminders`))
      }
    }
    
    transaction.onerror = () => {
      const error = transaction.error
      console.error('[SW] ❌ Transaction error saving reminders:', error)
      reject(error)
    }
    
    // Timeout safety
    setTimeout(() => {
      if (saved < reminders.length) {
        console.warn(`[SW] ⚠️ Timeout: Only saved ${saved}/${reminders.length} reminders`)
        if (saved > 0) {
          resolve() // Resolve anyway if some were saved
        } else {
          reject(new Error('Timeout saving reminders'))
        }
      }
    }, 5000)
  })
}

// Handle messages from main app
self.addEventListener('message', async (event) => {
  console.log('[SW] Received message:', event.data)
  
  if (event.data && event.data.type === 'SAVE_REMINDERS') {
    // Legacy support - save reminders if sent via message
    console.log(`[SW] ✅ Received SAVE_REMINDERS message`)
    console.log(`[SW] Reminder count: ${event.data.reminders?.length || 0}`)
    
    if (event.data.reminders && event.data.reminders.length > 0) {
      try {
        await saveRemindersToSW(event.data.reminders)
        console.log('[SW] ✅ Reminders saved via message')
        await checkReminders()
      } catch (error) {
        console.error('[SW] ❌ Error saving reminders:', error)
      }
    }
  }
  
  if (event.data && event.data.type === 'REFRESH_REMINDERS') {
    // Legacy IndexedDB approach
    console.log(`[SW] ✅ Received REFRESH_REMINDERS message (legacy IndexedDB)`)
    await new Promise(resolve => setTimeout(resolve, 500))
    await checkReminders()
    initReminderChecking()
  }
  
  if (event.data && event.data.type === 'REFRESH_REMINDERS_FROM_SUPABASE') {
    // New Supabase approach
    console.log(`[SW] ✅ Received REFRESH_REMINDERS_FROM_SUPABASE message`)
    console.log(`[SW] User ID: ${event.data.userId}`)
    console.log(`[SW] Reminder count: ${event.data.reminderCount || 'unknown'}`)
    console.log(`[SW] Current Supabase config - userId: ${currentUserId ? 'set' : 'NOT SET'}, token: ${currentAccessToken ? 'set' : 'NOT SET'}`)
    
    // Ensure reminder checking is initialized
    if (!reminderCheckInterval) {
      console.log('[SW] Initializing reminder checking interval...')
      initReminderChecking()
    }
    
    // Check reminders immediately from Supabase
    await checkReminders()
  }
  
  if (event.data && event.data.type === 'SCHEDULE_REMINDERS') {
    // Triggered when reminder settings are updated
    console.log(`[SW] ✅ Received SCHEDULE_REMINDERS message - refreshing reminders from Supabase`)
    
    // If Supabase config is available, refresh reminders immediately
    if (currentUserId && currentAccessToken) {
      console.log(`[SW] Refreshing reminders for user ${currentUserId}`)
      // Ensure reminder checking is initialized
      if (!reminderCheckInterval) {
        console.log('[SW] Initializing reminder checking interval...')
        initReminderChecking()
      }
      // Check reminders immediately - this will fetch fresh data from Supabase
      await checkReminders()
      console.log(`[SW] ✅ Reminders refreshed after settings update`)
    } else {
      console.warn(`[SW] ⚠️ Cannot refresh reminders - Supabase config not set`)
      console.warn(`[SW] 💡 Waiting for ReminderScheduler to send config...`)
    }
  }
  
  if (event.data && event.data.type === 'SET_SUPABASE_CONFIG') {
    // Set Supabase configuration from main app
    SUPABASE_URL = event.data.supabaseUrl
    SUPABASE_ANON_KEY = event.data.supabaseAnonKey
    currentUserId = event.data.userId
    currentAccessToken = event.data.accessToken
    console.log('[SW] ✅ Supabase configuration received and set')
    console.log(`[SW] Supabase URL: ${SUPABASE_URL ? 'configured' : 'not set'}`)
    console.log(`[SW] User ID: ${currentUserId || 'not set'}`)
    console.log(`[SW] Access Token: ${currentAccessToken ? 'present' : 'missing'}`)
    
    // Initialize reminder checking with new config
    initReminderChecking()
    
    // Check reminders immediately with new config
    await checkReminders()
  }
  
  if (event.data && event.data.type === 'SCHEDULE_REMINDERS') {
    // Triggered when reminder settings are updated
    console.log(`[SW] ✅ Received SCHEDULE_REMINDERS message - refreshing reminders from Supabase`)
    
    // If Supabase config is available, refresh reminders immediately
    if (currentUserId && currentAccessToken) {
      console.log(`[SW] Refreshing reminders for user ${currentUserId}`)
      // Ensure reminder checking is initialized
      if (!reminderCheckInterval) {
        console.log('[SW] Initializing reminder checking interval...')
        initReminderChecking()
      }
      // Check reminders immediately - this will fetch fresh data from Supabase
      await checkReminders()
      console.log(`[SW] ✅ Reminders refreshed after settings update`)
    } else {
      console.warn(`[SW] ⚠️ Cannot refresh reminders - Supabase config not set`)
      console.warn(`[SW] 💡 Waiting for ReminderScheduler to send config...`)
      // Still try to check - might work if config was set earlier
      await checkReminders()
    }
  }
  
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    console.log('[SW] Test notification requested')
    try {
      await self.registration.showNotification(event.data.title || 'Test Notification', {
        body: event.data.body || 'This is a test notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
      })
      console.log('[SW] ✅ Test notification shown')
    } catch (error) {
      console.error('[SW] ❌ Failed to show test notification:', error)
    }
  }
  
  if (event.data && event.data.type === 'DEBUG_REMINDERS') {
    console.log('[SW] 🔍 DEBUG: Checking reminder status...')
    const db = await openReminderDB()
    if (db) {
      const allReminders = await getAllReminders(db)
      console.log(`[SW] 🔍 DEBUG: Total reminders in DB: ${allReminders.length}`)
      if (allReminders.length > 0) {
        console.log('[SW] 🔍 DEBUG: Reminder details:')
        allReminders.forEach((r, i) => {
          console.log(`[SW] 🔍 ${i + 1}. ${r.id}: ${r.options?.title || 'no title'}, enabled: ${r.enabled}, nextTrigger: ${new Date(r.nextTriggerTime).toLocaleString()}`)
        })
      }
      await checkReminders()
    } else {
      console.error('[SW] 🔍 DEBUG: Cannot open DB')
    }
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


