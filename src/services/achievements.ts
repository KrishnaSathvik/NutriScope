import { supabase } from '@/lib/supabase'
import { Achievement, AchievementDefinition } from '@/types'
import { calculateLoggingStreak } from './streak'
import { getDailyLog } from './dailyLogs'
import { getMeals } from './meals'
import { getExercises } from './workouts'
import { format, subDays } from 'date-fns'

/**
 * Achievement definitions - all available achievements
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Streak achievements
  {
    key: 'streak_7',
    type: 'streak',
    title: 'On Fire',
    description: 'Logged data for 7 consecutive days',
    icon: null, // Use type-based icon
    condition: async (userData) => {
      const streak = await calculateLoggingStreak()
      return streak.currentStreak >= 7
    },
    progress: async (userData) => {
      const streak = await calculateLoggingStreak()
      return Math.min((streak.currentStreak / 7) * 100, 100)
    },
  },
  {
    key: 'streak_30',
    type: 'streak',
    title: 'Consistency Champion',
    description: 'Logged data for 30 consecutive days',
    icon: null,
    condition: async (userData) => {
      const streak = await calculateLoggingStreak()
      return streak.currentStreak >= 30
    },
    progress: async (userData) => {
      const streak = await calculateLoggingStreak()
      return Math.min((streak.currentStreak / 30) * 100, 100)
    },
  },
  {
    key: 'streak_100',
    type: 'streak',
    title: 'Century Streak',
    description: 'Logged data for 100 consecutive days',
    icon: null,
    condition: async (userData) => {
      const streak = await calculateLoggingStreak()
      return streak.currentStreak >= 100
    },
    progress: async (userData) => {
      const streak = await calculateLoggingStreak()
      return Math.min((streak.currentStreak / 100) * 100, 100)
    },
  },
  // Goal achievements
  {
    key: 'goal_calorie_5',
    type: 'goal',
    title: 'Goal Crusher',
    description: 'Met calorie goal 5 days in a row',
    icon: null,
    condition: async (userData) => {
      const { profile } = userData
      if (!profile?.calorie_target) return false
      
      let consecutiveDays = 0
      for (let i = 0; i < 5; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dailyLog = await getDailyLog(date)
        if (dailyLog.calories_consumed >= (profile.calorie_target || 2000)) {
          consecutiveDays++
        } else {
          break
        }
      }
      return consecutiveDays >= 5
    },
  },
  {
    key: 'goal_protein_7',
    type: 'goal',
    title: 'Protein Power',
    description: 'Met protein goal 7 days in a row',
    icon: null,
    condition: async (userData) => {
      const { profile } = userData
      if (!profile?.protein_target) return false
      
      let consecutiveDays = 0
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dailyLog = await getDailyLog(date)
        if (dailyLog.protein >= (profile.protein_target || 150)) {
          consecutiveDays++
        } else {
          break
        }
      }
      return consecutiveDays >= 7
    },
  },
  // Milestone achievements
  {
    key: 'milestone_first_meal',
    type: 'milestone',
    title: 'First Bite',
    description: 'Logged your first meal',
    icon: null,
    condition: async (userData) => {
      const meals = await getMeals()
      return meals.length > 0
    },
  },
  {
    key: 'milestone_first_workout',
    type: 'milestone',
    title: 'First Rep',
    description: 'Logged your first workout',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      return exercises.length > 0
    },
  },
  {
    key: 'milestone_10_meals',
    type: 'milestone',
    title: 'Meal Master',
    description: 'Logged 10 meals',
    icon: null,
    condition: async (userData) => {
      const meals = await getMeals()
      return meals.length >= 10
    },
    progress: async (userData) => {
      const meals = await getMeals()
      return Math.min((meals.length / 10) * 100, 100)
    },
  },
  {
    key: 'milestone_10_workouts',
    type: 'milestone',
    title: 'Workout Warrior',
    description: 'Logged 10 workouts',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      return exercises.length >= 10
    },
    progress: async (userData) => {
      const exercises = await getExercises()
      return Math.min((exercises.length / 10) * 100, 100)
    },
  },
  {
    key: 'milestone_30_days',
    type: 'milestone',
    title: 'Month Master',
    description: 'Logged data for 30 days',
    icon: null,
    condition: async (userData) => {
      // Check if user has logged meals/exercises for at least 30 days total
      // This is approximate - counts unique dates with logs
      try {
        const meals = await getMeals()
        const exercises = await getExercises()
        const uniqueDates = new Set([
          ...meals.map(m => m.date),
          ...exercises.map(e => e.date)
        ])
        return uniqueDates.size >= 30
      } catch {
        return false
      }
    },
    progress: async (userData) => {
      try {
        const meals = await getMeals()
        const exercises = await getExercises()
        const uniqueDates = new Set([
          ...meals.map(m => m.date),
          ...exercises.map(e => e.date)
        ])
        return Math.min((uniqueDates.size / 30) * 100, 100)
      } catch {
        return 0
      }
    },
  },
  // Special achievements
  {
    key: 'special_perfect_week',
    type: 'special',
    title: 'Perfect Week',
    description: 'Logged meals and workouts every day for a week',
    icon: null,
    condition: async (userData) => {
      let perfectDays = 0
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dailyLog = await getDailyLog(date)
        if (dailyLog.meals.length > 0 && dailyLog.exercises.length > 0) {
          perfectDays++
        }
      }
      return perfectDays >= 7
    },
    progress: async (userData) => {
      let perfectDays = 0
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dailyLog = await getDailyLog(date)
        if (dailyLog.meals.length > 0 && dailyLog.exercises.length > 0) {
          perfectDays++
        }
      }
      return (perfectDays / 7) * 100
    },
  },
]

/**
 * Get all achievements for the current user
 */
export async function getUserAchievements(): Promise<Achievement[]> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('Error fetching achievements:', error)
    throw new Error('Failed to fetch achievements')
  }

  return data || []
}

/**
 * Check and unlock achievements
 */
export async function checkAndUnlockAchievements(userData: { profile: any }): Promise<Achievement[]> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const unlockedAchievements: Achievement[] = []
  const existingAchievements = await getUserAchievements()
  const existingKeys = new Set(existingAchievements.map(a => a.achievement_key))

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    // Skip if already unlocked
    if (existingKeys.has(definition.key)) continue

    try {
      const unlocked = await definition.condition(userData)
      if (unlocked) {
        const progress = definition.progress ? await definition.progress(userData) : 100

        const { data, error } = await supabase
          .from('achievements')
          .insert({
            user_id: user.id,
            achievement_type: definition.type,
            achievement_key: definition.key,
            title: definition.title,
            description: definition.description,
            icon: definition.icon,
            progress: Math.round(progress),
          })
          .select()
          .single()

        if (!error && data) {
          unlockedAchievements.push(data)
        }
      }
    } catch (error) {
      console.error(`Error checking achievement ${definition.key}:`, error)
    }
  }

  return unlockedAchievements
}

/**
 * Get achievement progress for a specific achievement
 */
export async function getAchievementProgress(achievementKey: string, userData: { profile: any }): Promise<number> {
  const definition = ACHIEVEMENT_DEFINITIONS.find(d => d.key === achievementKey)
  if (!definition || !definition.progress) return 0

  try {
    return await definition.progress(userData)
  } catch (error) {
    console.error(`Error getting progress for ${achievementKey}:`, error)
    return 0
  }
}

// Cache for streak data to avoid multiple calculations
let cachedStreakData: { data: any; timestamp: number } | null = null
const STREAK_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached streak data or calculate it
 */
async function getCachedStreak(): Promise<any> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (cachedStreakData && (now - cachedStreakData.timestamp) < STREAK_CACHE_DURATION) {
    return cachedStreakData.data
  }
  
  // Calculate and cache with timeout
  try {
    const streakPromise = calculateLoggingStreak()
    const timeoutPromise = new Promise<any>((resolve) => 
      setTimeout(() => resolve({ currentStreak: 0, longestStreak: 0, isActive: false }), 5000)
    )
    const streak = await Promise.race([streakPromise, timeoutPromise])
    cachedStreakData = { data: streak, timestamp: now }
    return streak
  } catch (error) {
    console.error('Error calculating streak:', error)
    // Return default if calculation fails
    return { currentStreak: 0, longestStreak: 0, isActive: false }
  }
}

/**
 * Get all achievement definitions with user progress
 * Optimized with caching and error handling
 */
export async function getAchievementsWithProgress(userData: { profile: any }): Promise<Array<AchievementDefinition & { unlocked: boolean; progress: number }>> {
  try {
    const userAchievements = await getUserAchievements()
    const unlockedKeys = new Set(userAchievements.map(a => a.achievement_key))
    
    // Pre-calculate streak once (used by multiple achievements)
    const streakData = await getCachedStreak()

    // Process achievements with timeout and error handling
    const results = await Promise.allSettled(
      ACHIEVEMENT_DEFINITIONS.map(async (definition) => {
        try {
          const unlocked = unlockedKeys.has(definition.key)
          let progress = unlocked ? 100 : 0
          
          // If progress function exists, call it with timeout
          if (definition.progress) {
            // Use cached streak data for streak-related achievements
            if (definition.key.startsWith('streak_')) {
              // Use cached streak data
              if (definition.key === 'streak_7') {
                progress = Math.min((streakData.currentStreak / 7) * 100, 100)
              } else if (definition.key === 'streak_30') {
                progress = Math.min((streakData.currentStreak / 30) * 100, 100)
              } else if (definition.key === 'streak_100') {
                progress = Math.min((streakData.currentStreak / 100) * 100, 100)
              }
            } else {
              // For other achievements, call progress function with timeout
              const progressPromise = definition.progress(userData)
              const timeoutPromise = new Promise<number>((resolve) => 
                setTimeout(() => resolve(unlocked ? 100 : 0), 3000)
              )
              progress = await Promise.race([progressPromise, timeoutPromise])
            }
          }

          return {
            ...definition,
            unlocked,
            progress: Math.round(progress),
          }
        } catch (error) {
          console.error(`Error calculating progress for ${definition.key}:`, error)
          // Return default values on error
          return {
            ...definition,
            unlocked: unlockedKeys.has(definition.key),
            progress: unlockedKeys.has(definition.key) ? 100 : 0,
          }
        }
      })
    )

    // Extract successful results, use defaults for failed ones
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        const definition = ACHIEVEMENT_DEFINITIONS[index]
        return {
          ...definition,
          unlocked: unlockedKeys.has(definition.key),
          progress: unlockedKeys.has(definition.key) ? 100 : 0,
        }
      }
    })
  } catch (error) {
    console.error('Error getting achievements with progress:', error)
    // Return basic achievement list without progress if everything fails
    return ACHIEVEMENT_DEFINITIONS.map((definition) => ({
      ...definition,
      unlocked: false,
      progress: 0,
    }))
  }
}

