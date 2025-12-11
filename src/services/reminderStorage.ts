/**
 * Reminder Storage Service
 * Uses IndexedDB to persistently store reminders that work even when tab is closed
 */

export interface StoredReminder {
  id: string
  type: 'daily' | 'weekly' | 'recurring' | 'smart'
  scheduledTime: number // Unix timestamp in milliseconds
  nextTriggerTime: number // Next time to trigger
  intervalMinutes?: number // For recurring reminders
  daysOfWeek?: number[] // For weekly reminders (0-6, Sunday-Saturday)
  startTime?: string // HH:mm format for recurring
  endTime?: string // HH:mm format for recurring
  options: {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: any
  }
  enabled: boolean
  lastTriggered?: number
  triggerCount: number
  userId: string
  createdAt: number
  updatedAt: number
}

const DB_NAME = 'NutriScopeReminders'
const DB_VERSION = 1
const STORE_NAME = 'reminders'

class ReminderStorage {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        console.warn('[ReminderStorage] IndexedDB not supported')
        resolve()
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[ReminderStorage] Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[ReminderStorage] IndexedDB initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('nextTriggerTime', 'nextTriggerTime', { unique: false })
          store.createIndex('enabled', 'enabled', { unique: false })
          console.log('[ReminderStorage] Created object store')
        }
      }
    })

    return this.initPromise
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }

  /**
   * Save a reminder to IndexedDB
   */
  async saveReminder(reminder: StoredReminder): Promise<void> {
    await this.ensureInit()
    if (!this.db) {
      throw new Error('IndexedDB not available')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({
        ...reminder,
        updatedAt: Date.now(),
      })

      request.onsuccess = () => {
        console.log(`[ReminderStorage] Saved reminder: ${reminder.id}`)
        resolve()
      }

      request.onerror = () => {
        console.error('[ReminderStorage] Failed to save reminder:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all reminders for a user
   */
  async getUserReminders(userId: string): Promise<StoredReminder[]> {
    await this.ensureInit()
    if (!this.db) {
      return []
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('[ReminderStorage] Failed to get reminders:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all enabled reminders that should trigger soon
   */
  async getUpcomingReminders(maxTime: number = Date.now() + 24 * 60 * 60 * 1000): Promise<StoredReminder[]> {
    await this.ensureInit()
    if (!this.db) {
      return []
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('nextTriggerTime')
      const range = IDBKeyRange.upperBound(maxTime)
      const request = index.getAll(range)

      request.onsuccess = () => {
        const reminders = (request.result || []).filter(
          (r: StoredReminder) => r.enabled && r.nextTriggerTime <= maxTime
        )
        resolve(reminders)
      }

      request.onerror = () => {
        console.error('[ReminderStorage] Failed to get upcoming reminders:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(id: string): Promise<void> {
    await this.ensureInit()
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`[ReminderStorage] Deleted reminder: ${id}`)
        resolve()
      }

      request.onerror = () => {
        console.error('[ReminderStorage] Failed to delete reminder:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete all reminders for a user
   */
  async deleteUserReminders(userId: string): Promise<void> {
    await this.ensureInit()
    if (!this.db) {
      return
    }

    const reminders = await this.getUserReminders(userId)
    await Promise.all(reminders.map((r) => this.deleteReminder(r.id)))
  }

  /**
   * Update reminder's next trigger time
   */
  async updateNextTriggerTime(id: string, nextTriggerTime: number): Promise<void> {
    await this.ensureInit()
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
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

  /**
   * Toggle reminder enabled state
   */
  async toggleReminder(id: string, enabled: boolean): Promise<void> {
    await this.ensureInit()
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const reminder = getRequest.result
        if (!reminder) {
          resolve()
          return
        }

        reminder.enabled = enabled
        reminder.updatedAt = Date.now()

        const putRequest = store.put(reminder)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }
}

export const reminderStorage = new ReminderStorage()

