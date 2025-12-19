/**
 * Smart Reminder Service (LEGACY - NOT USED IN CURRENT FLOW)
 * 
 * ⚠️ WARNING: This service is LEGACY CODE and is NOT actively used in the current reminder system.
 * 
 * The current reminder system uses:
 * - `supabaseReminders.ts` - Primary service that stores reminders in Supabase database
 * - Service Worker (`public/sw.js`) - Fetches reminders from Supabase and triggers notifications
 * 
 * This file was originally designed for IndexedDB-only storage but has been superseded by
 * the Supabase-based approach for better reliability and cross-device synchronization.
 * 
 * **Why this file still exists:**
 * - Kept as a fallback/offline mechanism (though not currently integrated)
 * - Contains useful reminder calculation logic that could be reused
 * - May be needed for future offline-first features
 * 
 * **Current Status:**
 * - ❌ NOT called by ReminderScheduler component
 * - ❌ NOT used in production flow
 * - ⚠️ May contain outdated logic
 * 
 * **If you need to modify reminder logic:**
 * - Edit `src/services/supabaseReminders.ts` instead
 * - This file should only be modified if implementing offline fallback
 * 
 * @deprecated Use `supabaseReminders.ts` instead
 */

import { reminderStorage, StoredReminder } from './reminderStorage'
import { ReminderSettings } from '@/types'
import { format } from 'date-fns'

export interface SmartReminderContext {
  userId: string
  lastMealTime?: Date
  lastWaterLogTime?: Date
  lastWorkoutTime?: Date
  averageMealTimes?: { breakfast: string; lunch: string; dinner: string }
  timezone: string
  currentActivity?: 'active' | 'idle' | 'sleeping'
}

export interface SmartReminderConfig {
  id: string
  type: 'meal' | 'water' | 'workout' | 'goal' | 'streak' | 'weight'
  baseTime: string // HH:mm format
  days?: number[] // For weekly reminders
  adaptive?: boolean // Learn from user behavior
  contextAware?: boolean // Adjust based on context
  snoozeEnabled?: boolean
  maxSnoozes?: number
}

class SmartReminderService {
  /**
   * Calculate optimal reminder time based on user behavior
   */
  calculateOptimalTime(
    baseTime: string,
    userHistory: Date[],
    adaptive: boolean = true
  ): string {
    if (!adaptive || userHistory.length === 0) {
      return baseTime
    }

    // Calculate average time user actually logs
    const times = userHistory.map((date) => {
      const hours = date.getHours()
      const minutes = date.getMinutes()
      return hours * 60 + minutes // Convert to minutes since midnight
    })

    const avgMinutes = times.reduce((a, b) => a + b, 0) / times.length

    // Suggest reminder 15 minutes before average time
    const reminderMinutes = avgMinutes - 15
    const reminderHours = Math.floor(Math.max(0, reminderMinutes) / 60)
    const reminderMins = Math.round(Math.max(0, reminderMinutes) % 60)

    return `${String(reminderHours).padStart(2, '0')}:${String(reminderMins).padStart(2, '0')}`
  }

  /**
   * Check if user is likely sleeping or inactive
   */
  isQuietHours(currentTime: Date): boolean {
    const hour = currentTime.getHours()
    // Don't send reminders between 10 PM and 6 AM
    return hour >= 22 || hour < 6
  }

  /**
   * Calculate next trigger time for a reminder
   */
  calculateNextTriggerTime(
    reminder: StoredReminder,
    currentTime: Date = new Date()
  ): number {
    const now = currentTime.getTime()

    switch (reminder.type) {
      case 'daily': {
        const [hours, minutes] = reminder.options.data?.time
          ? reminder.options.data.time.split(':').map(Number)
          : [8, 0] // Default 8 AM

        const nextTrigger = new Date(currentTime)
        nextTrigger.setHours(hours, minutes, 0, 0)

        // If time has passed today, schedule for tomorrow
        if (nextTrigger.getTime() <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 1)
        }

        return nextTrigger.getTime()
      }

      case 'weekly': {
        const [hours, minutes] = reminder.options.data?.time
          ? reminder.options.data.time.split(':').map(Number)
          : [8, 0]

        const days = reminder.daysOfWeek || [1, 2, 3, 4, 5] // Default weekdays
        
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

        // Find next occurrence
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
        if (!reminder.intervalMinutes) {
          return now + 60 * 60 * 1000 // Default 1 hour
        }

        const intervalMs = reminder.intervalMinutes * 60 * 1000
        
        // For recurring reminders, maintain alignment with the scheduled time
        // Calculate next trigger from the last trigger time, maintaining interval alignment
        const lastTriggered = reminder.lastTriggered || reminder.scheduledTime || now
        
        // Calculate next trigger based on interval from last triggered time
        let nextTrigger = lastTriggered + intervalMs

        // Apply start/end time constraints
        if (reminder.startTime && reminder.endTime) {
          const [startHour, startMin] = reminder.startTime.split(':').map(Number)
          const [endHour, endMin] = reminder.endTime.split(':').map(Number)

          const nextTriggerDate = new Date(nextTrigger)
          const triggerHour = nextTriggerDate.getHours()
          const triggerMin = nextTriggerDate.getMinutes()

          // If before start time, set to start time
          if (triggerHour < startHour || (triggerHour === startHour && triggerMin < startMin)) {
            nextTriggerDate.setHours(startHour, startMin, 0, 0)
            nextTrigger = nextTriggerDate.getTime()
          }

          // If after end time, schedule for next day at start time
          if (triggerHour > endHour || (triggerHour === endHour && triggerMin >= endMin)) {
            nextTriggerDate.setDate(nextTriggerDate.getDate() + 1)
            nextTriggerDate.setHours(startHour, startMin, 0, 0)
            nextTrigger = nextTriggerDate.getTime()
          }
        }

        return nextTrigger
      }

      case 'smart': {
        // Smart reminders adapt based on context
        // For now, use daily logic but can be enhanced
        return this.calculateNextTriggerTime(
          { ...reminder, type: 'daily' },
          currentTime
        )
      }

      default:
        return now + 60 * 60 * 1000 // Default 1 hour
    }
  }

  /**
   * Create reminder from user settings
   */
  async createReminderFromSettings(
    userId: string,
    settings: ReminderSettings
  ): Promise<void> {
    console.log(`[SmartReminders] createReminderFromSettings called for user ${userId}`)
    console.log(`[SmartReminders] Settings enabled: ${settings.enabled}`)
    
    await reminderStorage.init()
    console.log('[SmartReminders] IndexedDB initialized')

    // Clear existing reminders for this user
    const existingReminders = await reminderStorage.getUserReminders(userId)
    console.log(`[SmartReminders] Found ${existingReminders.length} existing reminders, clearing...`)
    await reminderStorage.deleteUserReminders(userId)
    console.log('[SmartReminders] Existing reminders cleared')

    if (!settings.enabled) {
      console.log('[SmartReminders] Reminders disabled in settings, skipping creation')
      return
    }

    const reminders: StoredReminder[] = []
    console.log('[SmartReminders] Starting to create reminders from settings...')

    // Meal reminders
    if (settings.meal_reminders?.enabled) {
      const mealReminders = settings.meal_reminders

      if (mealReminders.breakfast) {
        reminders.push({
          id: `meal-breakfast-${userId}`,
          type: 'daily',
          scheduledTime: Date.now(),
          nextTriggerTime: this.calculateNextTriggerTime(
            {
              id: '',
              type: 'daily',
              scheduledTime: Date.now(),
              nextTriggerTime: 0,
              options: { title: '', body: '', data: { time: mealReminders.breakfast } },
              enabled: true,
              triggerCount: 0,
              userId: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            new Date()
          ),
          options: {
            title: 'Breakfast Time! 🍳',
            body: 'Time to log your breakfast and start your day right.',
            tag: 'meal-breakfast',
            data: { url: '/meals', time: mealReminders.breakfast },
          },
          enabled: true,
          triggerCount: 0,
          userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      if (mealReminders.lunch) {
        reminders.push({
          id: `meal-lunch-${userId}`,
          type: 'daily',
          scheduledTime: Date.now(),
          nextTriggerTime: this.calculateNextTriggerTime(
            {
              id: '',
              type: 'daily',
              scheduledTime: Date.now(),
              nextTriggerTime: 0,
              options: { title: '', body: '', data: { time: mealReminders.lunch } },
              enabled: true,
              triggerCount: 0,
              userId: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            new Date()
          ),
          options: {
            title: 'Lunch Time! 🥗',
            body: "Don't forget to log your lunch.",
            tag: 'meal-lunch',
            data: { url: '/meals', time: mealReminders.lunch },
          },
          enabled: true,
          triggerCount: 0,
          userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      if (mealReminders.dinner) {
        reminders.push({
          id: `meal-dinner-${userId}`,
          type: 'daily',
          scheduledTime: Date.now(),
          nextTriggerTime: this.calculateNextTriggerTime(
            {
              id: '',
              type: 'daily',
              scheduledTime: Date.now(),
              nextTriggerTime: 0,
              options: { title: '', body: '', data: { time: mealReminders.dinner } },
              enabled: true,
              triggerCount: 0,
              userId: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            new Date()
          ),
          options: {
            title: 'Dinner Time! 🍽️',
            body: 'Time to log your dinner.',
            tag: 'meal-dinner',
            data: { url: '/meals', time: mealReminders.dinner },
          },
          enabled: true,
          triggerCount: 0,
          userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      if (mealReminders.morning_snack) {
        reminders.push({
          id: `meal-morning-snack-${userId}`,
          type: 'daily',
          scheduledTime: Date.now(),
          nextTriggerTime: this.calculateNextTriggerTime(
            {
              id: '',
              type: 'daily',
              scheduledTime: Date.now(),
              nextTriggerTime: 0,
              options: { title: '', body: '', data: { time: mealReminders.morning_snack } },
              enabled: true,
              triggerCount: 0,
              userId: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            new Date()
          ),
          options: {
            title: 'Morning Snack Time! 🍎',
            body: 'Time for your morning snack.',
            tag: 'meal-morning-snack',
            data: { url: '/meals', time: mealReminders.morning_snack },
          },
          enabled: true,
          triggerCount: 0,
          userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      if (mealReminders.evening_snack) {
        reminders.push({
          id: `meal-evening-snack-${userId}`,
          type: 'daily',
          scheduledTime: Date.now(),
          nextTriggerTime: this.calculateNextTriggerTime(
            {
              id: '',
              type: 'daily',
              scheduledTime: Date.now(),
              nextTriggerTime: 0,
              options: { title: '', body: '', data: { time: mealReminders.evening_snack } },
              enabled: true,
              triggerCount: 0,
              userId: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            new Date()
          ),
          options: {
            title: 'Evening Snack Time! 🍪',
            body: 'Time for your evening snack.',
            tag: 'meal-evening-snack',
            data: { url: '/meals', time: mealReminders.evening_snack },
          },
          enabled: true,
          triggerCount: 0,
          userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    }

    // Water reminders
    if (settings.water_reminders?.enabled) {
      const waterReminders = settings.water_reminders
      const intervalMinutes = waterReminders.interval_minutes || 60
      const startTime = waterReminders.start_time || '08:00'
      const endTime = waterReminders.end_time || '22:00'

      // Calculate initial trigger time aligned to start time and interval
      const now = new Date()
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      const startTimeToday = new Date(now)
      startTimeToday.setHours(startHour, startMin, 0, 0)
      
      const intervalMs = intervalMinutes * 60 * 1000
      let initialTriggerTime = startTimeToday.getTime()
      
      // If start time has passed today, calculate next interval from start time
      if (initialTriggerTime <= now.getTime()) {
        const timeSinceStart = now.getTime() - initialTriggerTime
        const intervalsPassed = Math.floor(timeSinceStart / intervalMs) + 1
        initialTriggerTime = initialTriggerTime + (intervalsPassed * intervalMs)
        
        // Check if we've exceeded end time
        const endTimeToday = new Date(now)
        endTimeToday.setHours(endHour, endMin, 0, 0)
        
        if (initialTriggerTime > endTimeToday.getTime()) {
          // Schedule for next day's start time
          startTimeToday.setDate(startTimeToday.getDate() + 1)
          initialTriggerTime = startTimeToday.getTime()
        }
      }

      reminders.push({
        id: `water-${userId}`,
        type: 'recurring',
        scheduledTime: startTimeToday.getTime(), // Use start time as base for alignment
        nextTriggerTime: initialTriggerTime,
        intervalMinutes,
        startTime,
        endTime,
        options: {
          title: 'Stay Hydrated! 💧',
          body: `It's been ${intervalMinutes} minutes. Time for some water!`,
          tag: 'water',
          data: { url: '/water' },
        },
        enabled: true,
        triggerCount: 0,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Workout reminders
    if (settings.workout_reminders?.enabled) {
      const workoutReminders = settings.workout_reminders
      const time = workoutReminders.time || '18:00'
      const days = workoutReminders.days || [1, 2, 3, 4, 5]

      reminders.push({
        id: `workout-${userId}`,
        type: 'weekly',
        scheduledTime: Date.now(),
        nextTriggerTime: this.calculateNextTriggerTime(
          {
            id: '',
            type: 'weekly',
            scheduledTime: Date.now(),
            nextTriggerTime: 0,
            daysOfWeek: days,
            options: { title: '', body: '', data: { time } },
            enabled: true,
            triggerCount: 0,
            userId: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          new Date()
        ),
        daysOfWeek: days,
        options: {
          title: 'Workout Time! 💪',
          body: "Don't forget to log your workout.",
          tag: 'workout',
          data: { url: '/workouts', time },
        },
        enabled: true,
        triggerCount: 0,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Goal Progress Reminders
    if (settings.goal_reminders?.enabled) {
      const goalReminders = settings.goal_reminders
      const checkTime = goalReminders.check_progress_time || '20:00'

      reminders.push({
        id: `goal-${userId}`,
        type: 'daily',
        scheduledTime: Date.now(),
        nextTriggerTime: this.calculateNextTriggerTime(
          {
            id: '',
            type: 'daily',
            scheduledTime: Date.now(),
            nextTriggerTime: 0,
            options: { title: '', body: '', data: { time: checkTime } },
            enabled: true,
            triggerCount: 0,
            userId: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          new Date()
        ),
        options: {
          title: 'Goal Check-in! 🎯',
          body: 'Check your progress toward your daily goals.',
          tag: 'goal',
          data: { url: '/dashboard', time: checkTime },
        },
        enabled: true,
        triggerCount: 0,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Weight Logging Reminders
    if (settings.weight_reminders?.enabled) {
      const weightReminders = settings.weight_reminders
      const time = weightReminders.time || '08:00'
      const days = weightReminders.days || [1, 2, 3, 4, 5, 6, 0] // Daily by default
      
      // If all 7 days are selected, treat as daily reminder
      const isDaily = days.length === 7 && days.every(d => [0,1,2,3,4,5,6].includes(d))

      reminders.push({
        id: `weight-${userId}`,
        type: isDaily ? 'daily' : 'weekly',
        scheduledTime: Date.now(),
        nextTriggerTime: this.calculateNextTriggerTime(
          {
            id: '',
            type: isDaily ? 'daily' : 'weekly',
            scheduledTime: Date.now(),
            nextTriggerTime: 0,
            daysOfWeek: isDaily ? undefined : days,
            options: { title: '', body: '', data: { time } },
            enabled: true,
            triggerCount: 0,
            userId: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          new Date()
        ),
        daysOfWeek: isDaily ? undefined : days,
        options: {
          title: 'Log Your Weight! ⚖️',
          body: "Don't forget to track your weight today.",
          tag: 'weight',
          data: { url: '/dashboard', time },
        },
        enabled: true,
        triggerCount: 0,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Streak Reminders
    if (settings.streak_reminders?.enabled) {
      const streakReminders = settings.streak_reminders
      const time = streakReminders.time || '19:00'
      const checkDays = streakReminders.check_days || [1, 2, 3, 4, 5] // Weekdays by default

      reminders.push({
        id: `streak-${userId}`,
        type: 'weekly',
        scheduledTime: Date.now(),
        nextTriggerTime: this.calculateNextTriggerTime(
          {
            id: '',
            type: 'weekly',
            scheduledTime: Date.now(),
            nextTriggerTime: 0,
            daysOfWeek: checkDays,
            options: { title: '', body: '', data: { time } },
            enabled: true,
            triggerCount: 0,
            userId: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          new Date()
        ),
        daysOfWeek: checkDays,
        options: {
          title: 'Maintain Your Streak! 🔥',
          body: "Log something today to keep your streak going!",
          tag: 'streak',
          data: { url: '/dashboard', time },
        },
        enabled: true,
        triggerCount: 0,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Daily Summary Reminders
    if (settings.summary_reminders?.enabled) {
      const summaryReminders = settings.summary_reminders
      const time = summaryReminders.time || '20:00'

      reminders.push({
        id: `summary-${userId}`,
        type: 'daily',
        scheduledTime: Date.now(),
        nextTriggerTime: this.calculateNextTriggerTime(
          {
            id: '',
            type: 'daily',
            scheduledTime: Date.now(),
            nextTriggerTime: 0,
            options: { title: '', body: '', data: { time } },
            enabled: true,
            triggerCount: 0,
            userId: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          new Date()
        ),
        options: {
          title: 'Daily Summary 📊',
          body: 'View your daily progress summary and insights.',
          tag: 'summary',
          data: { url: `/summary/${format(new Date(), 'yyyy-MM-dd')}`, time },
        },
        enabled: true,
        triggerCount: 0,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Save all reminders to IndexedDB (main thread)
    console.log(`[SmartReminders] Saving ${reminders.length} reminders for user ${userId}`)
    for (const reminder of reminders) {
      await reminderStorage.saveReminder(reminder)
      console.log(`[SmartReminders] Saved reminder ${reminder.id} (${reminder.options.title}) - next trigger: ${new Date(reminder.nextTriggerTime).toLocaleString()}`)
    }

    // CRITICAL: Wait for all IndexedDB transactions to complete before notifying service worker
    // IndexedDB transactions are asynchronous, so we need to wait for them to finish
    await new Promise(resolve => setTimeout(resolve, 300))

    // CRITICAL: Notify service worker to refresh reminders from IndexedDB
    // IndexedDB is shared, so the service worker can read directly, but we need to notify it
    // to refresh its cache and check for updated reminders immediately
    await this.sendRemindersToServiceWorker(userId, reminders)
  }

  /**
   * Notify service worker about reminders
   * NOTE: IndexedDB IS shared between main thread and service worker!
   * The service worker can read reminders directly from IndexedDB.
   * This function just notifies the SW to refresh its cache.
   */
  private async sendRemindersToServiceWorker(userId: string, reminders: StoredReminder[]): Promise<void> {
    console.log('[SmartReminders] 💡 IndexedDB is SHARED - service worker can read reminders directly!')
    console.log('[SmartReminders] 🔄 Notifying service worker to refresh reminders...')
    
    if (!('serviceWorker' in navigator)) {
      console.warn('[SmartReminders] ⚠️ Service workers not supported')
      return
    }

    // Try to notify service worker, but don't fail if controller isn't available
    // The service worker will read from IndexedDB directly when it checks reminders
    try {
      const registration = await navigator.serviceWorker.ready.catch(() => null)
      if (registration) {
        const controller = navigator.serviceWorker.controller
        if (controller) {
          console.log('[SmartReminders] ✅ Notifying service worker to refresh reminders')
          console.log('[SmartReminders] Reminder details:', reminders.map(r => ({
            id: r.id,
            title: r.options.title,
            nextTrigger: new Date(r.nextTriggerTime).toLocaleString()
          })))
          controller.postMessage({
            type: 'REFRESH_REMINDERS',
            userId,
            reminderCount: reminders.length,
            // Include updated reminder IDs so service worker knows which ones changed
            reminderIds: reminders.map(r => r.id),
          })
          
          // Also send SCHEDULE_REMINDERS to force immediate check
          setTimeout(() => {
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_REMINDERS',
                userId,
              })
            }
          }, 200)
        } else {
          console.log('[SmartReminders] ℹ️ No controller, but reminders are saved in shared IndexedDB')
          console.log('[SmartReminders] ℹ️ Service worker will read them directly on next check')
        }
      }
    } catch (error) {
      console.warn('[SmartReminders] ⚠️ Could not notify service worker:', error)
      console.log('[SmartReminders] ℹ️ Reminders are saved - service worker will read from IndexedDB')
    }
  }

  /**
   * Get all reminders for a user
   */
  async getUserReminders(userId: string): Promise<StoredReminder[]> {
    await reminderStorage.init()
    return reminderStorage.getUserReminders(userId)
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(id: string): Promise<void> {
    await reminderStorage.init()
    await reminderStorage.deleteReminder(id)
  }

  /**
   * Toggle reminder enabled state
   */
  async toggleReminder(id: string, enabled: boolean): Promise<void> {
    await reminderStorage.init()
    await reminderStorage.toggleReminder(id, enabled)
  }
}

export const smartReminderService = new SmartReminderService()

