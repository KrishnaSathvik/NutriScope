/**
 * Notification Service
 * Handles browser notifications and reminder scheduling
 */

export type ReminderType = 'meal' | 'water' | 'workout' | 'goal'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  data?: any
}

class NotificationService {
  private permission: NotificationPermission = 'default'
  private scheduledReminders: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications are not supported in this browser')
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    if (this.permission === 'default') {
      try {
        const permission = await Notification.requestPermission()
        this.permission = permission
        return permission
      } catch (error) {
        console.error('Error requesting notification permission:', error)
        return 'denied'
      }
    }

    return this.permission
  }

  /**
   * Check if notifications are supported and permitted
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  /**
   * Check if permission is granted
   * Refreshes permission state from browser if available
   */
  hasPermission(): boolean {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Always check current browser permission state
      this.permission = Notification.permission
    }
    return this.permission === 'granted'
  }

  /**
   * Show a browser notification
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications are not supported')
      return
    }

    if (this.permission !== 'granted') {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.warn('Notification permission denied')
        return
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data,
      })

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      // Handle click
      notification.onclick = () => {
        window.focus()
        notification.close()
        if (options.data?.url) {
          window.location.href = options.data.url
        }
      }
    } catch (error) {
      console.error('Error showing notification:', error)
    }
  }

  /**
   * Schedule a reminder
   */
  scheduleReminder(
    id: string,
    time: Date,
    options: NotificationOptions
  ): void {
    // Clear existing reminder with same ID
    this.cancelReminder(id)

    const now = new Date()
    const delay = time.getTime() - now.getTime()

    if (delay <= 0) {
      console.warn('Reminder time is in the past')
      return
    }

    const timeoutId = setTimeout(() => {
      this.showNotification(options)
      this.scheduledReminders.delete(id)
    }, delay)

    this.scheduledReminders.set(id, timeoutId)
  }

  /**
   * Schedule a recurring reminder (e.g., every hour for water)
   */
  scheduleRecurringReminder(
    id: string,
    intervalMinutes: number,
    startTime: Date,
    endTime: Date,
    options: NotificationOptions
  ): void {
    // Clear existing reminder with same ID
    this.cancelReminder(id)

    const scheduleNext = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const startHour = startTime.getHours()
      const startMinute = startTime.getMinutes()
      const endHour = endTime.getHours()
      const endMinute = endTime.getMinutes()

      // Calculate next reminder time
      let nextReminder = new Date(now)
      nextReminder.setMinutes(currentMinute + intervalMinutes)
      nextReminder.setSeconds(0)
      nextReminder.setMilliseconds(0)

      // If we've passed the end time, schedule for tomorrow
      if (
        currentHour > endHour ||
        (currentHour === endHour && currentMinute >= endMinute)
      ) {
        nextReminder.setDate(nextReminder.getDate() + 1)
        nextReminder.setHours(startHour)
        nextReminder.setMinutes(startMinute)
      }

      // If next reminder is before start time, set to start time
      if (
        nextReminder.getHours() < startHour ||
        (nextReminder.getHours() === startHour &&
          nextReminder.getMinutes() < startMinute)
      ) {
        nextReminder.setHours(startHour)
        nextReminder.setMinutes(startMinute)
      }

      const delay = nextReminder.getTime() - now.getTime()

      const timeoutId = setTimeout(() => {
        this.showNotification(options)
        // Schedule the next occurrence
        scheduleNext()
      }, delay)

      this.scheduledReminders.set(id, timeoutId)
    }

    scheduleNext()
  }

  /**
   * Schedule a daily reminder at a specific time
   */
  scheduleDailyReminder(
    id: string,
    time: string, // HH:mm format
    options: NotificationOptions
  ): void {
    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    const reminderTime = new Date()
    reminderTime.setHours(hours, minutes, 0, 0)

    // If time has passed today, schedule for tomorrow
    if (reminderTime.getTime() <= now.getTime()) {
      reminderTime.setDate(reminderTime.getDate() + 1)
    }

    const scheduleNext = () => {
      const delay = reminderTime.getTime() - new Date().getTime()

      const timeoutId = setTimeout(() => {
        this.showNotification(options)
        // Schedule for next day
        reminderTime.setDate(reminderTime.getDate() + 1)
        scheduleNext()
      }, delay)

      this.scheduledReminders.set(id, timeoutId)
    }

    scheduleNext()
  }

  /**
   * Schedule a weekly reminder (specific days of week)
   */
  scheduleWeeklyReminder(
    id: string,
    time: string, // HH:mm format
    days: number[], // 0-6, Sunday-Saturday
    options: NotificationOptions
  ): void {
    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    const currentDay = now.getDay()

    // Find next occurrence
    let daysUntilNext = 7
    for (const day of days) {
      let daysDiff = day - currentDay
      if (daysDiff < 0) daysDiff += 7
      if (daysDiff < daysUntilNext) {
        daysUntilNext = daysDiff
      }
    }

    const nextReminder = new Date(now)
    nextReminder.setDate(nextReminder.getDate() + daysUntilNext)
    nextReminder.setHours(hours, minutes, 0, 0)

    // If same day but time passed, schedule for next week
    if (daysUntilNext === 0 && nextReminder.getTime() <= now.getTime()) {
      nextReminder.setDate(nextReminder.getDate() + 7)
    }

    const scheduleNext = () => {
      const delay = nextReminder.getTime() - new Date().getTime()

      const timeoutId = setTimeout(() => {
        this.showNotification(options)
        // Schedule for next week
        nextReminder.setDate(nextReminder.getDate() + 7)
        scheduleNext()
      }, delay)

      this.scheduledReminders.set(id, timeoutId)
    }

    scheduleNext()
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(id: string): void {
    const timeoutId = this.scheduledReminders.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.scheduledReminders.delete(id)
    }
  }

  /**
   * Cancel all scheduled reminders
   */
  cancelAllReminders(): void {
    this.scheduledReminders.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.scheduledReminders.clear()
  }
}

// Export singleton instance
export const notificationService = new NotificationService()

