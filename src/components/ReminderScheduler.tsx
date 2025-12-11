import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationService } from '@/services/notifications'
import { smartReminderService } from '@/services/smartReminders'
import { ReminderSettings } from '@/types'
import { getDailyLog } from '@/services/dailyLogs'
import { getWaterIntake } from '@/services/water'

/**
 * ReminderScheduler Component
 * Handles scheduling and triggering reminders based on user settings
 */
export function ReminderScheduler() {
  const { user, profile } = useAuth()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!user || !profile || initializedRef.current) {
      if (!user) {
        console.log('[ReminderScheduler] No user, skipping initialization')
      } else if (!profile) {
        console.log('[ReminderScheduler] No profile, skipping initialization')
      } else if (initializedRef.current) {
        console.log('[ReminderScheduler] Already initialized, skipping')
      }
      return
    }

    const settings: ReminderSettings | undefined = profile.reminder_settings

    console.log('[ReminderScheduler] Initializing with settings:', settings)

    if (!settings?.enabled) {
      console.log('[ReminderScheduler] Reminders are disabled in settings')
      return
    }

    initializedRef.current = true

    // Request notification permission and check if granted
    notificationService.requestPermission().then(async (permission) => {
      console.log('[ReminderScheduler] Notification permission:', permission)
      
      if (permission !== 'granted') {
        console.warn('[ReminderScheduler] Notification permission not granted:', permission)
        return
      }

      console.log('[ReminderScheduler] Scheduling smart reminders...')

      try {
        // Use smart reminder service to create reminders from settings
        // This stores reminders in IndexedDB and works even when tab is closed
        await smartReminderService.createReminderFromSettings(user.id, settings)
        console.log('[ReminderScheduler] Smart reminders scheduled successfully')
      } catch (error) {
        console.error('[ReminderScheduler] Error scheduling smart reminders:', error)
        // Fallback to old notification service if smart reminders fail
        console.log('[ReminderScheduler] Falling back to basic reminders...')
        scheduleBasicReminders(settings)
      }
    }).catch((error) => {
      console.error('[ReminderScheduler] Error initializing reminders:', error)
    })

    // Cleanup on unmount
    return () => {
      console.log('[ReminderScheduler] Cleaning up reminders')
      // Cancel old-style reminders (if any)
      notificationService.cancelAllReminders()
      initializedRef.current = false
    }
  }, [user, profile])

  // Re-initialize when settings change
  useEffect(() => {
    initializedRef.current = false
  }, [profile?.reminder_settings])

  return null
}

/**
 * Fallback: Schedule basic reminders using old notification service
 * Used when smart reminders fail or for immediate notifications
 */
function scheduleBasicReminders(settings: ReminderSettings): void {
  // Schedule meal reminders
  if (settings.meal_reminders?.enabled) {
    const mealReminders = settings.meal_reminders

    if (mealReminders.breakfast) {
      notificationService.scheduleDailyReminder(
        'meal-breakfast',
        mealReminders.breakfast,
        {
          title: 'Breakfast Time!',
          body: 'Time to log your breakfast and start your day right.',
          tag: 'meal-breakfast',
          data: { url: '/meals' },
        }
      )
    }

    if (mealReminders.lunch) {
      notificationService.scheduleDailyReminder(
        'meal-lunch',
        mealReminders.lunch,
        {
          title: 'Lunch Time!',
          body: 'Don\'t forget to log your lunch.',
          tag: 'meal-lunch',
          data: { url: '/meals' },
        }
      )
    }

    if (mealReminders.dinner) {
      notificationService.scheduleDailyReminder(
        'meal-dinner',
        mealReminders.dinner,
        {
          title: 'Dinner Time!',
          body: 'Time to log your dinner.',
          tag: 'meal-dinner',
          data: { url: '/meals' },
        }
      )
    }
  }

  // Schedule water reminders
  if (settings.water_reminders?.enabled) {
    const waterReminders = settings.water_reminders
    const intervalMinutes = waterReminders.interval_minutes || 60
    const startTime = new Date()
    const endTime = new Date()

    if (waterReminders.start_time) {
      const [startHour, startMin] = waterReminders.start_time.split(':').map(Number)
      startTime.setHours(startHour, startMin, 0, 0)
    } else {
      startTime.setHours(8, 0, 0, 0)
    }

    if (waterReminders.end_time) {
      const [endHour, endMin] = waterReminders.end_time.split(':').map(Number)
      endTime.setHours(endHour, endMin, 0, 0)
    } else {
      endTime.setHours(22, 0, 0, 0)
    }

    notificationService.scheduleRecurringReminder(
      'water-reminder',
      intervalMinutes,
      startTime,
      endTime,
      {
        title: 'Stay Hydrated!',
        body: 'Time to drink some water. Track your intake to meet your daily goal.',
        tag: 'water-reminder',
        data: { url: '/meals' },
      }
    )
  }

  // Schedule workout reminders
  if (settings.workout_reminders?.enabled && settings.workout_reminders.time) {
    const workoutTime = settings.workout_reminders.time
    const workoutReminders = settings.workout_reminders
    const days = workoutReminders.days || [1, 2, 3, 4, 5]

    notificationService.scheduleWeeklyReminder(
      'workout-reminder',
      workoutTime,
      days,
      {
        title: 'Workout Time!',
        body: 'Time to log your workout and stay active.',
        tag: 'workout-reminder',
        data: { url: '/workouts' },
      }
    )
  }
}

/**
 * Check and show goal-based reminders
 */
export async function checkGoalReminders(
  userId: string,
  profile: any
): Promise<void> {
  if (!profile?.reminder_settings?.goal_reminders?.enabled) return

  const today = new Date().toISOString().split('T')[0]
  const dailyLog = await getDailyLog(today)
  const waterIntake = await getWaterIntake(userId, today)

  const calorieGoal = profile.calorie_target || 2000
  const proteinGoal = profile.protein_target || 150
  const waterGoal = profile.water_goal || 2000

  // Check if goals are met
  const calorieProgress = (dailyLog.calories_consumed / calorieGoal) * 100
  const proteinProgress = (dailyLog.protein / proteinGoal) * 100
  const waterProgress = (waterIntake / waterGoal) * 100

  // Show encouragement if close to goals
  if (calorieProgress >= 80 && calorieProgress < 100) {
    notificationService.showNotification({
      title: 'Almost There!',
      body: `You're at ${Math.round(calorieProgress)}% of your calorie goal. Keep going!`,
      tag: 'goal-encouragement',
      data: { url: '/dashboard' },
    })
  }

  if (proteinProgress >= 80 && proteinProgress < 100) {
    notificationService.showNotification({
      title: 'Protein Goal!',
      body: `You're at ${Math.round(proteinProgress)}% of your protein goal.`,
      tag: 'goal-encouragement',
      data: { url: '/dashboard' },
    })
  }

  if (waterProgress >= 80 && waterProgress < 100) {
    notificationService.showNotification({
      title: 'Hydration Goal!',
      body: `You're at ${Math.round(waterProgress)}% of your water goal.`,
      tag: 'goal-encouragement',
      data: { url: '/dashboard' },
    })
  }
}

