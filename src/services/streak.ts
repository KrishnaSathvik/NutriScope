import { getMeals } from '@/services/meals'
import { getExercises } from '@/services/workouts'
import { getWaterIntake } from '@/services/water'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { getUserStreak, updateUserStreak } from './streaks'

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
  let tempStreak = 0
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
      
      tempStreak++
      
      // If we found today, this is part of current streak
      if (foundToday && i === tempStreak - 1) {
        currentStreak = tempStreak
      }
      
      // Update longest streak
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak
      }
    } else {
      // If we found today and hit a gap, streak is broken
      if (foundToday && i > 0) {
        // We've already counted consecutive days, so break
        break
      }
      // Reset temp streak for longest streak calculation
      tempStreak = 0
    }
  }

  // If today hasn't been logged yet, check if yesterday was logged
  // If yesterday was logged, streak is still active (just not logged today)
  if (!foundToday && currentStreak > 0) {
    const yesterday = format(subDays(today, 1), 'yyyy-MM-dd')
    const hasMeal = await checkHasMeal(user.id, yesterday)
    const hasWorkout = await checkHasWorkout(user.id, yesterday)
    const hasWater = await checkHasWater(user.id, yesterday)
    
    if (hasMeal || hasWorkout || hasWater) {
      // Streak is still active, just not logged today yet
      const result = {
        currentStreak,
        longestStreak,
        lastLoggedDate,
        isActive: true,
      }
      
      // Phase 2: Save to DB
      updateUserStreak(user.id, result).catch(err => {
        console.warn('Failed to save streak to DB:', err)
      })
      
      return result
    }
  }

  const result = {
    currentStreak: foundToday ? currentStreak : 0,
    longestStreak,
    lastLoggedDate,
    isActive: foundToday,
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

