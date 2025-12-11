import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationService } from '@/services/notifications'
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
    notificationService.requestPermission().then((permission) => {
      console.log('[ReminderScheduler] Notification permission:', permission)
      
      if (permission !== 'granted') {
        console.warn('[ReminderScheduler] Notification permission not granted:', permission)
        return
      }

      console.log('[ReminderScheduler] Scheduling reminders...')

      // Schedule meal reminders
      if (settings.meal_reminders?.enabled) {
        console.log('[ReminderScheduler] Scheduling meal reminders')
        const mealReminders = settings.meal_reminders

        if (mealReminders.breakfast) {
          console.log('[ReminderScheduler] Scheduling breakfast reminder at', mealReminders.breakfast)
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
          console.log('[ReminderScheduler] Scheduling lunch reminder at', mealReminders.lunch)
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
          console.log('[ReminderScheduler] Scheduling dinner reminder at', mealReminders.dinner)
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

        if (mealReminders.morning_snack) {
          console.log('[ReminderScheduler] Scheduling morning snack reminder at', mealReminders.morning_snack)
          notificationService.scheduleDailyReminder(
            'meal-morning-snack',
            mealReminders.morning_snack,
            {
              title: 'Morning Snack',
              body: 'Time for your morning snack.',
              tag: 'meal-morning-snack',
              data: { url: '/meals' },
            }
          )
        }

        if (mealReminders.evening_snack) {
          console.log('[ReminderScheduler] Scheduling evening snack reminder at', mealReminders.evening_snack)
          notificationService.scheduleDailyReminder(
            'meal-evening-snack',
            mealReminders.evening_snack,
            {
              title: 'Evening Snack',
              body: 'Time for your evening snack.',
              tag: 'meal-evening-snack',
              data: { url: '/meals' },
            }
          )
        }
      }

      // Schedule water reminders
      if (settings.water_reminders?.enabled) {
        console.log('[ReminderScheduler] Scheduling water reminders')
        const waterReminders = settings.water_reminders
        const intervalMinutes = waterReminders.interval_minutes || 60
        const startTime = new Date()
        const endTime = new Date()

        if (waterReminders.start_time) {
          const [startHour, startMin] = waterReminders.start_time
            .split(':')
            .map(Number)
          startTime.setHours(startHour, startMin, 0, 0)
        } else {
          startTime.setHours(8, 0, 0, 0) // Default 8 AM
        }

        if (waterReminders.end_time) {
          const [endHour, endMin] = waterReminders.end_time
            .split(':')
            .map(Number)
          endTime.setHours(endHour, endMin, 0, 0)
        } else {
          endTime.setHours(22, 0, 0, 0) // Default 10 PM
        }

        console.log('[ReminderScheduler] Water reminder:', {
          intervalMinutes,
          startTime: startTime.toLocaleTimeString(),
          endTime: endTime.toLocaleTimeString(),
        })

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
        console.log('[ReminderScheduler] Scheduling workout reminders at', workoutTime)
        const workoutReminders = settings.workout_reminders
        const days = workoutReminders.days || [1, 2, 3, 4, 5] // Default weekdays

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

      // Schedule goal check reminders
      if (settings.goal_reminders?.enabled && settings.goal_reminders.check_progress_time) {
        const goalTime = settings.goal_reminders.check_progress_time
        console.log('[ReminderScheduler] Scheduling goal check reminder at', goalTime)
        notificationService.scheduleDailyReminder(
          'goal-check',
          goalTime,
          {
            title: 'Check Your Progress',
            body: 'Review your daily progress and see how you\'re doing with your goals.',
            tag: 'goal-check',
            data: { url: '/dashboard' },
          }
        )
      }

      // Schedule weight logging reminders
      if (settings.weight_reminders?.enabled && settings.weight_reminders.time) {
        const weightTime = settings.weight_reminders.time
        console.log('[ReminderScheduler] Scheduling weight reminder at', weightTime)
        const weightReminders = settings.weight_reminders
        const days = weightReminders.days || [1, 2, 3, 4, 5, 6, 0] // Default: daily

        notificationService.scheduleWeeklyReminder(
          'weight-reminder',
          weightTime,
          days,
          {
            title: 'Log Your Weight',
            body: 'Time to track your weight and monitor your progress.',
            tag: 'weight-reminder',
            data: { url: '/dashboard' },
          }
        )
      }

      // Schedule streak reminders
      if (settings.streak_reminders?.enabled && settings.streak_reminders.time) {
        const streakTime = settings.streak_reminders.time
        console.log('[ReminderScheduler] Scheduling streak reminder at', streakTime)
        const streakReminders = settings.streak_reminders
        const days = streakReminders.check_days || [1, 2, 3, 4, 5] // Default: weekdays

        notificationService.scheduleWeeklyReminder(
          'streak-reminder',
          streakTime,
          days,
          {
            title: 'Keep Your Streak Going!',
            body: 'Don\'t forget to log your meals, workouts, or water to maintain your streak.',
            tag: 'streak-reminder',
            data: { url: '/dashboard' },
          }
        )
      }

      // Schedule daily summary reminders
      if (settings.summary_reminders?.enabled && settings.summary_reminders.time) {
        const summaryTime = settings.summary_reminders.time
        console.log('[ReminderScheduler] Scheduling summary reminder at', summaryTime)
        notificationService.scheduleDailyReminder(
          'summary-reminder',
          summaryTime,
          {
            title: 'Daily Summary Ready',
            body: 'Check out your daily summary and AI insights for today.',
            tag: 'summary-reminder',
            data: { url: '/dashboard' },
          }
        )
      }

      console.log('[ReminderScheduler] All reminders scheduled successfully')
    }).catch((error) => {
      console.error('[ReminderScheduler] Error initializing reminders:', error)
    })

    // Cleanup on unmount
    return () => {
      console.log('[ReminderScheduler] Cleaning up reminders')
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

