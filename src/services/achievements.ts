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
      const streak = await calculateLoggingStreak()
      return streak.totalDaysLogged >= 30
    },
    progress: async (userData) => {
      const streak = await calculateLoggingStreak()
      return Math.min((streak.totalDaysLogged / 30) * 100, 100)
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

/**
 * Get all achievement definitions with user progress
 */
export async function getAchievementsWithProgress(userData: { profile: any }): Promise<Array<AchievementDefinition & { unlocked: boolean; progress: number }>> {
  const userAchievements = await getUserAchievements()
  const unlockedKeys = new Set(userAchievements.map(a => a.achievement_key))

  return Promise.all(
    ACHIEVEMENT_DEFINITIONS.map(async (definition) => {
      const unlocked = unlockedKeys.has(definition.key)
      const progress = definition.progress
        ? await definition.progress(userData)
        : (unlocked ? 100 : 0)

      return {
        ...definition,
        unlocked,
        progress: Math.round(progress),
      }
    })
  )
}

