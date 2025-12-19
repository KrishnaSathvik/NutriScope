/**
 * Supabase Reminder Service
 * Stores reminders in Supabase database for reliable triggering
 */

import { supabase } from '@/lib/supabase'
import { ReminderSettings } from '@/types'

export interface SupabaseReminder {
  id: string
  user_id: string
  type: 'meal' | 'water' | 'workout' | 'goal' | 'streak' | 'weight' | 'summary'
  reminder_type: 'daily' | 'weekly' | 'recurring' | 'smart'
  scheduled_time: string
  next_trigger_time: string
  interval_minutes?: number
  days_of_week?: number[]
  start_time?: string
  end_time?: string
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  enabled: boolean
  last_triggered?: string
  trigger_count: number
  created_at: string
  updated_at: string
}

class SupabaseReminderService {
  /**
   * Calculate next trigger time for a reminder
   */
  private calculateNextTriggerTime(
    reminderType: 'daily' | 'weekly' | 'recurring' | 'smart',
    time: string,
    currentTime: Date = new Date(),
    intervalMinutes?: number,
    daysOfWeek?: number[],
    startTime?: string,
    endTime?: string
  ): Date {
    const now = currentTime.getTime()

    switch (reminderType) {
      case 'daily': {
        const [hours, minutes] = time.split(':').map(Number)
        const nextTrigger = new Date(currentTime)
        nextTrigger.setHours(hours, minutes, 0, 0)

        // If time has passed today, schedule for tomorrow
        if (nextTrigger.getTime() <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 1)
        }

        return nextTrigger
      }

      case 'weekly': {
        const [hours, minutes] = time.split(':').map(Number)
        const days = daysOfWeek || [1, 2, 3, 4, 5]
        
        // If all 7 days are selected, treat as daily
        const allDaysSelected = days.length === 7 && days.every(d => [0,1,2,3,4,5,6].includes(d))
        
        if (allDaysSelected) {
          const nextTrigger = new Date(currentTime)
          nextTrigger.setHours(hours, minutes, 0, 0)
          
          if (nextTrigger.getTime() <= now) {
            nextTrigger.setDate(nextTrigger.getDate() + 1)
          }
          
          return nextTrigger
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

        // If same day but time passed, find next day
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
        if (!intervalMinutes || !startTime || !endTime) {
          return new Date(now + 60 * 60 * 1000) // Default 1 hour
        }

        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        
        const startTimeToday = new Date(currentTime)
        startTimeToday.setHours(startHour, startMin, 0, 0)
        
        const intervalMs = intervalMinutes * 60 * 1000
        let initialTriggerTime = startTimeToday.getTime()
        
        // If start time has passed today, calculate next interval from start time
        if (initialTriggerTime <= now) {
          const timeSinceStart = now - initialTriggerTime
          // Calculate how many complete intervals have passed
          const intervalsPassed = Math.floor(timeSinceStart / intervalMs)
          // Next trigger is the next interval boundary
          // Use intervalsPassed + 1 to get the next interval, but check if we're very close to current interval
          const nextIntervalTime = initialTriggerTime + ((intervalsPassed + 1) * intervalMs)
          
          // If we're within 30 seconds of the current interval boundary, use that instead
          const currentIntervalTime = initialTriggerTime + (intervalsPassed * intervalMs)
          const timeUntilCurrentInterval = currentIntervalTime - now
          
          // If current interval is within 30 seconds, use it (allows for slight timing variations)
          if (timeUntilCurrentInterval >= -30000 && timeUntilCurrentInterval <= 30000) {
            initialTriggerTime = currentIntervalTime
          } else {
            initialTriggerTime = nextIntervalTime
          }
          
          // Check if we've exceeded end time
          const endTimeToday = new Date(currentTime)
          endTimeToday.setHours(endHour, endMin, 0, 0)
          
          if (initialTriggerTime > endTimeToday.getTime()) {
            // Schedule for next day's start time
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

  /**
   * Create reminders from user settings and save to Supabase
   */
  async createRemindersFromSettings(
    userId: string,
    settings: ReminderSettings
  ): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    console.log(`[SupabaseReminders] Creating reminders for user ${userId}`)

    // Delete existing reminders for this user
    // CRITICAL: Wait for delete to complete before inserting to avoid duplicate key errors
    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[SupabaseReminders] Error deleting old reminders:', deleteError)
      // If delete fails, try to continue anyway - upsert will handle duplicates
      console.warn('[SupabaseReminders] Continuing despite delete error - will use upsert to handle duplicates')
    } else {
      console.log('[SupabaseReminders] Deleted existing reminders')
    }

    // Wait a moment to ensure delete transaction completes
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!settings.enabled) {
      console.log('[SupabaseReminders] Reminders disabled, skipping creation')
      return
    }

    const reminders: Omit<SupabaseReminder, 'created_at' | 'updated_at'>[] = []
    const now = new Date()

    // Meal reminders
    if (settings.meal_reminders?.enabled) {
      const mealReminders = settings.meal_reminders

      if (mealReminders.breakfast) {
        reminders.push({
          id: `meal-breakfast-${userId}`,
          user_id: userId,
          type: 'meal',
          reminder_type: 'daily',
          scheduled_time: now.toISOString(),
          next_trigger_time: this.calculateNextTriggerTime('daily', mealReminders.breakfast, now).toISOString(),
          title: 'Breakfast Time! 🍳',
          body: 'Time to log your breakfast and start your day right.',
          tag: 'meal-breakfast',
          data: { url: '/meals', time: mealReminders.breakfast },
          enabled: true,
          trigger_count: 0,
        })
      }

      if (mealReminders.lunch) {
        reminders.push({
          id: `meal-lunch-${userId}`,
          user_id: userId,
          type: 'meal',
          reminder_type: 'daily',
          scheduled_time: now.toISOString(),
          next_trigger_time: this.calculateNextTriggerTime('daily', mealReminders.lunch, now).toISOString(),
          title: 'Lunch Time! 🥗',
          body: "Don't forget to log your lunch.",
          tag: 'meal-lunch',
          data: { url: '/meals', time: mealReminders.lunch },
          enabled: true,
          trigger_count: 0,
        })
      }

      if (mealReminders.dinner) {
        reminders.push({
          id: `meal-dinner-${userId}`,
          user_id: userId,
          type: 'meal',
          reminder_type: 'daily',
          scheduled_time: now.toISOString(),
          next_trigger_time: this.calculateNextTriggerTime('daily', mealReminders.dinner, now).toISOString(),
          title: 'Dinner Time! 🍽️',
          body: 'Time to log your dinner.',
          tag: 'meal-dinner',
          data: { url: '/meals', time: mealReminders.dinner },
          enabled: true,
          trigger_count: 0,
        })
      }

      if (mealReminders.morning_snack) {
        reminders.push({
          id: `meal-morning-snack-${userId}`,
          user_id: userId,
          type: 'meal',
          reminder_type: 'daily',
          scheduled_time: now.toISOString(),
          next_trigger_time: this.calculateNextTriggerTime('daily', mealReminders.morning_snack, now).toISOString(),
          title: 'Morning Snack Time! 🍎',
          body: 'Time for your morning snack.',
          tag: 'meal-morning-snack',
          data: { url: '/meals', time: mealReminders.morning_snack },
          enabled: true,
          trigger_count: 0,
        })
      }

      if (mealReminders.evening_snack) {
        reminders.push({
          id: `meal-evening-snack-${userId}`,
          user_id: userId,
          type: 'meal',
          reminder_type: 'daily',
          scheduled_time: now.toISOString(),
          next_trigger_time: this.calculateNextTriggerTime('daily', mealReminders.evening_snack, now).toISOString(),
          title: 'Evening Snack Time! 🍪',
          body: 'Time for your evening snack.',
          tag: 'meal-evening-snack',
          data: { url: '/meals', time: mealReminders.evening_snack },
          enabled: true,
          trigger_count: 0,
        })
      }
    }

    // Water reminders
    if (settings.water_reminders?.enabled) {
      const waterReminders = settings.water_reminders
      const intervalMinutes = waterReminders.interval_minutes || 60
      const startTime = waterReminders.start_time || '08:00'
      const endTime = waterReminders.end_time || '22:00'

      const nextTrigger = this.calculateNextTriggerTime(
        'recurring',
        startTime,
        now,
        intervalMinutes,
        undefined,
        startTime,
        endTime
      )

      reminders.push({
        id: `water-${userId}`,
        user_id: userId,
        type: 'water',
        reminder_type: 'recurring',
        scheduled_time: now.toISOString(),
        next_trigger_time: nextTrigger.toISOString(),
        interval_minutes: intervalMinutes,
        start_time: startTime,
        end_time: endTime,
        title: 'Stay Hydrated! 💧',
        body: `It's been ${intervalMinutes} minutes. Time for some water!`,
        tag: 'water',
        data: { url: '/water' },
        enabled: true,
        trigger_count: 0,
      })
    }

    // Workout reminders
    if (settings.workout_reminders?.enabled) {
      const workoutReminders = settings.workout_reminders
      const time = workoutReminders.time || '18:00'
      const days = workoutReminders.days || [1, 2, 3, 4, 5]
      // If all 7 days are selected, treat as daily reminder
      const isDaily = days.length === 7 && days.every(d => [0,1,2,3,4,5,6].includes(d))

      reminders.push({
        id: `workout-${userId}`,
        user_id: userId,
        type: 'workout',
        reminder_type: isDaily ? 'daily' : 'weekly',
        scheduled_time: now.toISOString(),
        next_trigger_time: this.calculateNextTriggerTime(
          isDaily ? 'daily' : 'weekly',
          time,
          now,
          undefined,
          isDaily ? undefined : days
        ).toISOString(),
        days_of_week: isDaily ? undefined : days,
        title: 'Workout Time! 💪',
        body: "Don't forget to log your workout.",
        tag: 'workout',
        data: { url: '/workouts', time },
        enabled: true,
        trigger_count: 0,
      })
    }

    // Goal Progress Reminders
    if (settings.goal_reminders?.enabled) {
      const goalReminders = settings.goal_reminders
      const checkTime = goalReminders.check_progress_time || '20:00'

      reminders.push({
        id: `goal-${userId}`,
        user_id: userId,
        type: 'goal',
        reminder_type: 'daily',
        scheduled_time: now.toISOString(),
        next_trigger_time: this.calculateNextTriggerTime('daily', checkTime, now).toISOString(),
        title: 'Goal Check-in! 🎯',
        body: 'Check your progress toward your daily goals.',
        tag: 'goal',
        data: { url: '/dashboard', time: checkTime },
        enabled: true,
        trigger_count: 0,
      })
    }

    // Weight Logging Reminders
    if (settings.weight_reminders?.enabled) {
      const weightReminders = settings.weight_reminders
      const time = weightReminders.time || '08:00'
      const days = weightReminders.days || [1, 2, 3, 4, 5, 6, 0]
      const isDaily = days.length === 7 && days.every(d => [0,1,2,3,4,5,6].includes(d))

      reminders.push({
        id: `weight-${userId}`,
        user_id: userId,
        type: 'weight',
        reminder_type: isDaily ? 'daily' : 'weekly',
        scheduled_time: now.toISOString(),
        next_trigger_time: this.calculateNextTriggerTime(
          isDaily ? 'daily' : 'weekly',
          time,
          now,
          undefined,
          isDaily ? undefined : days
        ).toISOString(),
        days_of_week: isDaily ? undefined : days,
        title: 'Log Your Weight! ⚖️',
        body: "Don't forget to track your weight today.",
        tag: 'weight',
        data: { url: '/dashboard', time },
        enabled: true,
        trigger_count: 0,
      })
    }

    // Streak Reminders
    if (settings.streak_reminders?.enabled) {
      const streakReminders = settings.streak_reminders
      const time = streakReminders.time || '19:00'
      const checkDays = streakReminders.check_days || [1, 2, 3, 4, 5]

      reminders.push({
        id: `streak-${userId}`,
        user_id: userId,
        type: 'streak',
        reminder_type: 'weekly',
        scheduled_time: now.toISOString(),
        next_trigger_time: this.calculateNextTriggerTime('weekly', time, now, undefined, checkDays).toISOString(),
        days_of_week: checkDays,
        title: 'Maintain Your Streak! 🔥',
        body: "Log something today to keep your streak going!",
        tag: 'streak',
        data: { url: '/dashboard', time },
        enabled: true,
        trigger_count: 0,
      })
    }

    // Daily Summary Reminders
    if (settings.summary_reminders?.enabled) {
      const summaryReminders = settings.summary_reminders
      const time = summaryReminders.time || '20:00'

      reminders.push({
        id: `summary-${userId}`,
        user_id: userId,
        type: 'summary',
        reminder_type: 'daily',
        scheduled_time: now.toISOString(),
        next_trigger_time: this.calculateNextTriggerTime('daily', time, now).toISOString(),
        title: 'Daily Summary 📊',
        body: 'View your daily progress summary and insights.',
        tag: 'summary',
        data: { url: `/summary/${now.toISOString().split('T')[0]}` },
        enabled: true,
        trigger_count: 0,
      })
    }

    // Save all reminders to Supabase using upsert to handle any race conditions
    if (reminders.length > 0) {
      console.log(`[SupabaseReminders] Saving ${reminders.length} reminders to Supabase`)
      
      // Use upsert instead of insert to handle duplicates gracefully
      // This ensures that if delete didn't complete or reminders already exist, we update them instead
      const { error } = await supabase
        .from('reminders')
        .upsert(reminders, {
          onConflict: 'id',
          ignoreDuplicates: false, // Update existing records
        })

      if (error) {
        console.error('[SupabaseReminders] Error saving reminders:', error)
        // If upsert fails, try delete + insert as fallback
        console.log('[SupabaseReminders] Upsert failed, trying delete + insert fallback...')
        
        // Force delete all reminders for this user
        await supabase
          .from('reminders')
          .delete()
          .eq('user_id', userId)
        
        // Wait for delete to complete
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Now try insert again
        const { error: insertError } = await supabase
          .from('reminders')
          .insert(reminders)
        
        if (insertError) {
          console.error('[SupabaseReminders] Fallback insert also failed:', insertError)
          throw insertError
        }
        
        console.log(`[SupabaseReminders] ✅ Successfully saved ${reminders.length} reminders (fallback method)`)
      } else {
        console.log(`[SupabaseReminders] ✅ Successfully saved ${reminders.length} reminders`)
      }
      
      // Log each reminder for debugging
      reminders.forEach(r => {
        console.log(`[SupabaseReminders] - ${r.id}: ${r.title} at ${new Date(r.next_trigger_time).toLocaleString()}`)
      })
    } else {
      console.log('[SupabaseReminders] No reminders to save')
    }
  }

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(userId: string, windowMinutes: number = 30): Promise<SupabaseReminder[]> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .rpc('get_upcoming_reminders', {
        p_user_id: userId,
        p_window_minutes: windowMinutes,
      })

    if (error) {
      console.error('[SupabaseReminders] Error fetching upcoming reminders:', error)
      throw error
    }

    return data || []
  }

  /**
   * Update reminder after it's been triggered
   */
  async updateReminderAfterTrigger(
    reminderId: string,
    nextTriggerTime: Date,
    currentTriggerCount: number
  ): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { error } = await supabase
      .from('reminders')
      .update({
        last_triggered: new Date().toISOString(),
        next_trigger_time: nextTriggerTime.toISOString(),
        trigger_count: currentTriggerCount + 1,
      })
      .eq('id', reminderId)

    if (error) {
      console.error('[SupabaseReminders] Error updating reminder:', error)
      throw error
    }
  }

  /**
   * Get all reminders for a user (for debugging)
   */
  async getUserReminders(userId: string): Promise<SupabaseReminder[]> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('next_trigger_time', { ascending: true })

    if (error) {
      console.error('[SupabaseReminders] Error fetching reminders:', error)
      throw error
    }

    return data || []
  }
}

export const supabaseReminderService = new SupabaseReminderService()

