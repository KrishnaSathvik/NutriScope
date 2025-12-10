import { getWaterIntake } from '@/services/water'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { updateUserStreak } from './streaks'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastLoggedDate: string | null
  isActive: boolean
}

/**
 * Calculate logging streak based on meals, workouts, or water intake
 * A day counts as "logged" if user has at least one meal, workout, or water entry
 */
export async function calculateLoggingStreak(): Promise<StreakData> {
  if (!supabase) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLoggedDate: null,
      isActive: false,
    }
  }

  let user
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    if (error || !authUser) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastLoggedDate: null,
        isActive: false,
      }
    }
    user = authUser
  } catch (error) {
    console.error('Error getting user for streak calculation:', error)
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLoggedDate: null,
      isActive: false,
    }
  }

  if (!user) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLoggedDate: null,
      isActive: false,
    }
  }

  const today = new Date()
  let currentStreak = 0
  let longestStreak = 0
  let consecutiveDays = 0
  let lastLoggedDate: string | null = null
  let foundToday = false

  // Optimize: Check up to 90 days back (3 months) instead of 365 for performance
  // Most users won't have streaks longer than this, and it's much faster
  const maxDaysToCheck = 90
  
  // Check days starting from today going backwards
  for (let i = 0; i < maxDaysToCheck; i++) {
    const checkDate = subDays(today, i)
    const dateStr = format(checkDate, 'yyyy-MM-dd')
    
    // Check if user logged anything on this date
    const hasMeal = await checkHasMeal(user.id, dateStr)
    const hasWorkout = await checkHasWorkout(user.id, dateStr)
    const hasWater = await checkHasWater(user.id, dateStr)
    
    const hasLogged = hasMeal || hasWorkout || hasWater

    if (hasLogged) {
      if (i === 0) {
        foundToday = true
      }
      
      if (lastLoggedDate === null) {
        lastLoggedDate = dateStr
      }
      
      consecutiveDays++
      
      // Update longest streak
      if (consecutiveDays > longestStreak) {
        longestStreak = consecutiveDays
      }
      
      // Current streak is the consecutive days we've found
      currentStreak = consecutiveDays
    } else {
      // Hit a gap (day not logged)
      if (foundToday) {
        // Today is logged, so we've found the complete current streak
        // The gap breaks the streak
        break
      } else {
        // Today isn't logged
        if (consecutiveDays > 0) {
          // We have consecutive days from yesterday backwards
          // This is the active streak (user hasn't logged today yet, but streak is still active)
          break
        }
        // No consecutive days found yet, continue checking backwards
        // Don't reset consecutiveDays here - we want to keep checking for consecutive days
      }
    }
  }

  // If we found consecutive days but today isn't logged, streak is still active
  const isActive = foundToday || (consecutiveDays > 0 && !foundToday)

  const result = {
    currentStreak: currentStreak,
    longestStreak,
    lastLoggedDate,
    isActive,
  }
  
  // Phase 2: Save to DB
  updateUserStreak(user.id, result).catch(err => {
    console.warn('Failed to save streak to DB:', err)
  })
  
  return result
}

async function checkHasMeal(userId: string, date: string): Promise<boolean> {
  try {
    if (!supabase) return false
    const { data } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .limit(1)
    return (data?.length || 0) > 0
  } catch {
    return false
  }
}

async function checkHasWorkout(userId: string, date: string): Promise<boolean> {
  try {
    if (!supabase) return false
    const { data } = await supabase
      .from('exercises')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .limit(1)
    return (data?.length || 0) > 0
  } catch {
    return false
  }
}

async function checkHasWater(userId: string, date: string): Promise<boolean> {
  try {
    const water = await getWaterIntake(userId, date)
    return water > 0
  } catch {
    return false
  }
}

