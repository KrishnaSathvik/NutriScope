/**
 * Smart Reminder Service
 * Provides context-aware, adaptive reminders that learn from user behavior
 */

import { reminderStorage, StoredReminder } from './reminderStorage'
import { ReminderSettings } from '@/types'

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

        // If same day but time passed, schedule for next week
        if (daysUntilNext === 0 && nextTrigger.getTime() <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 7)
        }

        return nextTrigger.getTime()
      }

      case 'recurring': {
        if (!reminder.intervalMinutes) {
          return now + 60 * 60 * 1000 // Default 1 hour
        }

        const intervalMs = reminder.intervalMinutes * 60 * 1000
        const lastTriggered = reminder.lastTriggered || reminder.scheduledTime

        // Calculate next trigger based on interval
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
    await reminderStorage.init()

    // Clear existing reminders for this user
    await reminderStorage.deleteUserReminders(userId)

    if (!settings.enabled) {
      return
    }

    const reminders: StoredReminder[] = []

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
    }

    // Water reminders
    if (settings.water_reminders?.enabled) {
      const waterReminders = settings.water_reminders
      const intervalMinutes = waterReminders.interval_minutes || 60
      const startTime = waterReminders.start_time || '08:00'
      const endTime = waterReminders.end_time || '22:00'

      reminders.push({
        id: `water-${userId}`,
        type: 'recurring',
        scheduledTime: Date.now(),
        nextTriggerTime: this.calculateNextTriggerTime(
          {
            id: '',
            type: 'recurring',
            scheduledTime: Date.now(),
            nextTriggerTime: 0,
            intervalMinutes,
            startTime,
            endTime,
            options: { title: '', body: '' },
            enabled: true,
            triggerCount: 0,
            userId: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          new Date()
        ),
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

    // Save all reminders
    for (const reminder of reminders) {
      await reminderStorage.saveReminder(reminder)
    }

    // Notify service worker to reschedule
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_REMINDERS',
        userId,
      })
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

