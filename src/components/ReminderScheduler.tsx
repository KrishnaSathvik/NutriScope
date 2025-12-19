import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationService } from '@/services/notifications'
import { supabaseReminderService } from '@/services/supabaseReminders'
import { ReminderSettings } from '@/types'
import { getDailyLog } from '@/services/dailyLogs'
import { getWaterIntake } from '@/services/water'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * ReminderScheduler Component
 * Handles scheduling and triggering reminders based on user settings
 */
export function ReminderScheduler() {
  const { user, profile, session } = useAuth()
  const initializedRef = useRef(false)
  const processingRef = useRef(false) // Prevent concurrent executions
  const realtimeChannelRef = useRef<any>(null) // Store realtime channel
  
  // Listen for service worker messages (config confirmation and token expiration)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_CONFIG_RECEIVED') {
        console.log('[ReminderScheduler] ✅ Service worker confirmed config received:', event.data)
      }
      
      // Handle token expiration request from service worker
      if (event.data && event.data.type === 'SW_TOKEN_EXPIRED') {
        console.log('[ReminderScheduler] ⚠️ Service worker reported token expired, refreshing...')
        
        if (!supabase || !user) return
        
        try {
          // Get fresh session (Supabase client will auto-refresh if needed)
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('[ReminderScheduler] Error getting session:', error)
            return
          }
          
          if (session?.access_token) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
            
            if (supabaseUrl && supabaseAnonKey && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'REFRESH_ACCESS_TOKEN',
                accessToken: session.access_token,
                userId: user.id,
              })
              console.log('[ReminderScheduler] ✅ Token refresh sent to service worker')
            }
          }
        } catch (error) {
          console.error('[ReminderScheduler] Error handling token expiration:', error)
        }
      }
    }
    
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [user])

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
        
        // Verify reminders were saved and check their times
        const savedReminders = await supabaseReminderService.getUserReminders(user.id)
        console.log(`[ReminderScheduler] Verified: ${savedReminders.length} reminders saved to Supabase`)
        const now = new Date()
        savedReminders.forEach(r => {
          const triggerTime = new Date(r.next_trigger_time)
          const timeUntil = triggerTime.getTime() - now.getTime()
          const minutesUntil = Math.round(timeUntil / 1000 / 60)
          const isPast = timeUntil < 0
          console.log(`[ReminderScheduler] - ${r.id}: ${r.title}`)
          console.log(`[ReminderScheduler]   Scheduled: ${triggerTime.toLocaleString()}`)
          console.log(`[ReminderScheduler]   Time until: ${minutesUntil} minutes ${isPast ? '(PAST)' : ''}`)
          console.log(`[ReminderScheduler]   Enabled: ${r.enabled}`)
        })
        
        // Send Supabase config to service worker and notify to refresh reminders
        if ('serviceWorker' in navigator && isSupabaseConfigured() && session?.access_token) {
          // Wait for service worker to be ready with retry logic
          const sendConfigToSW = async (retryCount = 0) => {
            const MAX_RETRIES = 10 // Try up to 10 times (10 seconds total)
            try {
              // Ensure service worker is ready
              const registration = await navigator.serviceWorker.ready
              let controller = navigator.serviceWorker.controller || registration.active
              
              // If no controller, wait a bit and try again
              if (!controller && retryCount < MAX_RETRIES) {
                console.warn(`[ReminderScheduler] ⚠️ Service worker controller not available, retrying... (${retryCount + 1}/${MAX_RETRIES})`)
                setTimeout(() => sendConfigToSW(retryCount + 1), 1000)
                return
              }
              
              if (!controller) {
                console.error('[ReminderScheduler] ❌ Service worker controller not available after retries')
                return
              }
              
              console.log('[ReminderScheduler] 🔄 Sending Supabase config to service worker...')
              
              // Get Supabase URL and anon key from environment
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
              
              if (!supabaseUrl || !supabaseAnonKey) {
                console.error('[ReminderScheduler] ❌ Supabase environment variables not set')
                console.error('[ReminderScheduler] VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'NOT SET')
                console.error('[ReminderScheduler] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'NOT SET')
                return
              }
              
              // Send Supabase configuration first
              controller.postMessage({
                type: 'SET_SUPABASE_CONFIG',
                supabaseUrl,
                supabaseAnonKey,
                userId: user.id,
                accessToken: session.access_token,
              })
              
              console.log('[ReminderScheduler] ✅ Supabase config sent to service worker')
              
              // Wait a moment for config to be processed, then send refresh message
              setTimeout(() => {
                controller = navigator.serviceWorker.controller
                if (controller) {
                  controller.postMessage({
                    type: 'REFRESH_REMINDERS_FROM_SUPABASE',
                    userId: user.id,
                    reminderCount: savedReminders.length,
                  })
                  console.log('[ReminderScheduler] ✅ Refresh message sent to service worker')
                } else {
                  console.warn('[ReminderScheduler] ⚠️ Controller lost before sending refresh message')
                }
              }, 1000) // Increased delay to ensure config is processed
            } catch (error) {
              console.error('[ReminderScheduler] ❌ Failed to configure service worker:', error)
              // Retry if we haven't exceeded max retries
              if (retryCount < MAX_RETRIES) {
                console.log(`[ReminderScheduler] Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
                setTimeout(() => sendConfigToSW(retryCount + 1), 1000)
              }
            }
          }
          
          // Start sending config - try immediately, then retry if needed
          sendConfigToSW()
          
          // Register Periodic Background Sync if supported (for better mobile PWA support)
          if ('serviceWorker' in navigator && 'periodicSync' in (window as any)) {
            try {
              const registration = await navigator.serviceWorker.ready
              // Request permission for periodic sync
              const status = await (registration as any).periodicSync.register('check-reminders-periodic', {
                minInterval: 30 * 60 * 1000, // Minimum 30 minutes (browser may increase)
              })
              console.log('[ReminderScheduler] ✅ Periodic Background Sync registered:', status)
            } catch (error) {
              console.warn('[ReminderScheduler] ⚠️ Periodic Background Sync not available:', error)
              // This is fine - periodic sync is only supported in Chrome/Edge
            }
          }
        } else {
          console.warn('[ReminderScheduler] ⚠️ Cannot send config to service worker:', {
            hasServiceWorker: 'serviceWorker' in navigator,
            isSupabaseConfigured: isSupabaseConfigured(),
            hasAccessToken: !!session?.access_token,
            hasUser: !!user?.id
          })
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

  // Set up realtime subscription for reminders table
  useEffect(() => {
    if (!user || !supabase || !isSupabaseConfigured()) {
      return
    }

    console.log('[ReminderScheduler] Setting up realtime subscription for reminders')

    // Subscribe to reminders table changes
    const channel = supabase
      .channel(`reminders_user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('[ReminderScheduler] Reminder changed:', payload.eventType, payload.new || payload.old)
          
          // Debounce refresh messages to prevent spam
          // The service worker will also debounce, but we can reduce messages here too
          const reminderId = payload.new?.id || payload.old?.id
          console.log('[ReminderScheduler] Reminder ID:', reminderId)
          
          // Notify service worker to refresh reminders (service worker will debounce)
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'REFRESH_REMINDERS_FROM_SUPABASE',
              userId: user.id,
              reason: `reminder_${payload.eventType}`,
              reminderId: reminderId, // Include reminder ID for better logging
            })
            console.log('[ReminderScheduler] ✅ Notified service worker to refresh reminders after', payload.eventType)
          }
        }
      )
      .subscribe((status) => {
        console.log('[ReminderScheduler] Realtime subscription status:', status)
      })

    realtimeChannelRef.current = channel

    return () => {
      console.log('[ReminderScheduler] Cleaning up realtime subscription')
      if (realtimeChannelRef.current && supabase) {
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [user])

  // Set up token refresh listener to update service worker when token refreshes
  useEffect(() => {
    if (!user || !supabase || !isSupabaseConfigured()) {
      return
    }

    console.log('[ReminderScheduler] Setting up token refresh listener')

    // Listen for auth state changes (including token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // When token is refreshed, update service worker
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        console.log('[ReminderScheduler] Token refreshed, updating service worker...')
        
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseAnonKey && session.access_token) {
            navigator.serviceWorker.controller.postMessage({
              type: 'REFRESH_ACCESS_TOKEN',
              accessToken: session.access_token,
              userId: user.id,
            })
            console.log('[ReminderScheduler] ✅ Token refresh sent to service worker')
          }
        }
      }
    })

    // Also set up periodic token refresh check (every 50 minutes to refresh before 1 hour expiry)
    const tokenRefreshInterval = setInterval(async () => {
      if (!supabase) return
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseAnonKey) {
            navigator.serviceWorker.controller.postMessage({
              type: 'REFRESH_ACCESS_TOKEN',
              accessToken: session.access_token,
              userId: user.id,
            })
            console.log('[ReminderScheduler] ✅ Periodic token refresh sent to service worker')
          }
        }
      } catch (error) {
        console.error('[ReminderScheduler] Error refreshing token:', error)
      }
    }, 50 * 60 * 1000) // Every 50 minutes

    return () => {
      subscription.unsubscribe()
      clearInterval(tokenRefreshInterval)
    }
  }, [user])

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

