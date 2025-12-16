import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationService } from '@/services/notifications'
import { supabaseReminderService } from '@/services/supabaseReminders'
import { ReminderSettings } from '@/types'
import { getDailyLog } from '@/services/dailyLogs'
import { getWaterIntake } from '@/services/water'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * ReminderScheduler Component
 * Handles scheduling and triggering reminders based on user settings
 */
export function ReminderScheduler() {
  const { user, profile, session } = useAuth()
  const initializedRef = useRef(false)
  const processingRef = useRef(false) // Prevent concurrent executions

  useEffect(() => {
    console.log('[ReminderScheduler] useEffect triggered', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      userId: user?.id,
      settingsEnabled: profile?.reminder_settings?.enabled 
    })
    
    if (!user || !profile) {
      if (!user) {
        console.log('[ReminderScheduler] No user, skipping initialization')
      } else if (!profile) {
        console.log('[ReminderScheduler] No profile, skipping initialization')
      }
      return
    }

    // Prevent concurrent executions
    if (processingRef.current) {
      console.log('[ReminderScheduler] Already processing, skipping...')
      return
    }

    const settings: ReminderSettings | undefined = profile.reminder_settings

    console.log('[ReminderScheduler] Settings changed, re-initializing with settings:', settings)
    console.log('[ReminderScheduler] Full settings object:', JSON.stringify(settings, null, 2))

    // Reset initialization flag when settings change
    initializedRef.current = false
    processingRef.current = true

    if (!settings?.enabled) {
      console.log('[ReminderScheduler] Reminders are disabled in settings - deleting existing reminders')
      // Delete all reminders when disabled
      if (settings) {
        supabaseReminderService.createRemindersFromSettings(user.id, settings)
          .then(() => {
            console.log('[ReminderScheduler] ✅ Existing reminders deleted')
          })
          .catch((error) => {
            console.error('[ReminderScheduler] Error deleting reminders:', error)
          })
      }
      return
    }

    // Request notification permission and check if granted
    notificationService.requestPermission().then(async (permission) => {
      console.log('[ReminderScheduler] Notification permission:', permission)
      
      if (permission !== 'granted') {
        console.warn('[ReminderScheduler] Notification permission not granted:', permission)
        return
      }

      console.log('[ReminderScheduler] Scheduling smart reminders...')
      console.log('[ReminderScheduler] User ID:', user.id)
      console.log('[ReminderScheduler] Settings:', JSON.stringify(settings, null, 2))

      try {
        // Use Supabase reminder service to create reminders from settings
        // This stores reminders in Supabase database for reliable triggering
        await supabaseReminderService.createRemindersFromSettings(user.id, settings)
        console.log('[ReminderScheduler] ✅ Reminders scheduled successfully in Supabase')
        
        // Verify reminders were saved
        const savedReminders = await supabaseReminderService.getUserReminders(user.id)
        console.log(`[ReminderScheduler] Verified: ${savedReminders.length} reminders saved to Supabase`)
        savedReminders.forEach(r => {
          console.log(`[ReminderScheduler] - ${r.id}: ${r.title} at ${new Date(r.next_trigger_time).toLocaleString()}`)
        })
        
        // Send Supabase config to service worker and notify to refresh reminders
        if ('serviceWorker' in navigator && isSupabaseConfigured() && session?.access_token) {
          setTimeout(async () => {
            const controller = navigator.serviceWorker.controller
            if (controller) {
              console.log('[ReminderScheduler] 🔄 Sending Supabase config to service worker...')
              try {
                // Get Supabase URL and anon key from environment
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                
                // Send Supabase configuration
                controller.postMessage({
                  type: 'SET_SUPABASE_CONFIG',
                  supabaseUrl,
                  supabaseAnonKey,
                  userId: user.id,
                  accessToken: session.access_token,
                })
                
                // Also send refresh message
                controller.postMessage({
                  type: 'REFRESH_REMINDERS_FROM_SUPABASE',
                  userId: user.id,
                  reminderCount: savedReminders.length,
                })
                
                console.log('[ReminderScheduler] ✅ Service worker configured and notified')
              } catch (error) {
                console.error('[ReminderScheduler] ❌ Failed to configure service worker:', error)
              }
            }
          }, 500)
        }
        
        // Mark as initialized after successful scheduling
        initializedRef.current = true
        processingRef.current = false
      } catch (error) {
        console.error('[ReminderScheduler] Error scheduling smart reminders:', error)
        console.error('[ReminderScheduler] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        // Fallback to old notification service if smart reminders fail
        console.log('[ReminderScheduler] Falling back to basic reminders...')
        scheduleBasicReminders(settings)
        initializedRef.current = true
        processingRef.current = false
      }
    }).catch((error) => {
      console.error('[ReminderScheduler] Error initializing reminders:', error)
      processingRef.current = false
    })

    // Cleanup on unmount
    return () => {
      console.log('[ReminderScheduler] Cleaning up reminders')
      // Cancel old-style reminders (if any)
      notificationService.cancelAllReminders()
      initializedRef.current = false
      processingRef.current = false
    }
  }, [user, profile, profile?.reminder_settings]) // Include reminder_settings in dependencies

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

