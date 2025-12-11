import { supabase } from '@/lib/supabase'
import { Achievement, AchievementDefinition } from '@/types'
import { calculateLoggingStreak } from './streak'
import { getDailyLog } from './dailyLogs'
import { getMeals } from './meals'
import { getExercises } from './workouts'
import { getRecipes } from './recipes'
import { getWeightLogs } from './weightTracking'
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
    key: 'streak_14',
    type: 'streak',
    title: 'Two Week Warrior',
    description: 'Logged data for 14 consecutive days',
    icon: null,
    condition: async (userData) => {
      const streak = await calculateLoggingStreak()
      return streak.currentStreak >= 14
    },
    progress: async (userData) => {
      const streak = await calculateLoggingStreak()
      return Math.min((streak.currentStreak / 14) * 100, 100)
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
  {
    key: 'streak_60',
    type: 'streak',
    title: 'Two Month Master',
    description: 'Logged data for 60 consecutive days',
    icon: null,
    condition: async (userData) => {
      const streak = await calculateLoggingStreak()
      return streak.currentStreak >= 60
    },
    progress: async (userData) => {
      const streak = await calculateLoggingStreak()
      return Math.min((streak.currentStreak / 60) * 100, 100)
    },
  },
  {
    key: 'streak_365',
    type: 'streak',
    title: 'Year Champion',
    description: 'Logged data for 365 consecutive days',
    icon: null,
    condition: async (userData) => {
      const streak = await calculateLoggingStreak()
      return streak.currentStreak >= 365
    },
    progress: async (userData) => {
      const streak = await calculateLoggingStreak()
      return Math.min((streak.currentStreak / 365) * 100, 100)
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
  {
    key: 'goal_water_7',
    type: 'goal',
    title: 'Hydration Hero',
    description: 'Met water goal 7 days in a row',
    icon: null,
    condition: async (userData) => {
      const { profile } = userData
      const waterGoal = profile?.water_goal || 2000
      
      let consecutiveDays = 0
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dailyLog = await getDailyLog(date)
        if ((dailyLog.water_intake_ml || 0) >= waterGoal) {
          consecutiveDays++
        } else {
          break
        }
      }
      return consecutiveDays >= 7
    },
  },
  {
    key: 'goal_all_macros_3',
    type: 'goal',
    title: 'Macro Master',
    description: 'Met calorie, protein, and water goals 3 days in a row',
    icon: null,
    condition: async (userData) => {
      const { profile } = userData
      const calorieTarget = profile?.calorie_target || 2000
      const proteinTarget = profile?.protein_target || 150
      const waterGoal = profile?.water_goal || 2000
      
      let consecutiveDays = 0
      for (let i = 0; i < 3; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dailyLog = await getDailyLog(date)
        if (
          dailyLog.calories_consumed >= calorieTarget &&
          dailyLog.protein >= proteinTarget &&
          (dailyLog.water_intake_ml || 0) >= waterGoal
        ) {
          consecutiveDays++
        } else {
          break
        }
      }
      return consecutiveDays >= 3
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
  {
    key: 'milestone_50_meals',
    type: 'milestone',
    title: 'Meal Enthusiast',
    description: 'Logged 50 meals',
    icon: null,
    condition: async (userData) => {
      const meals = await getMeals()
      return meals.length >= 50
    },
    progress: async (userData) => {
      const meals = await getMeals()
      return Math.min((meals.length / 50) * 100, 100)
    },
  },
  {
    key: 'milestone_100_meals',
    type: 'milestone',
    title: 'Meal Master',
    description: 'Logged 100 meals',
    icon: null,
    condition: async (userData) => {
      const meals = await getMeals()
      return meals.length >= 100
    },
    progress: async (userData) => {
      const meals = await getMeals()
      return Math.min((meals.length / 100) * 100, 100)
    },
  },
  {
    key: 'milestone_500_meals',
    type: 'milestone',
    title: 'Meal Legend',
    description: 'Logged 500 meals',
    icon: null,
    condition: async (userData) => {
      const meals = await getMeals()
      return meals.length >= 500
    },
    progress: async (userData) => {
      const meals = await getMeals()
      return Math.min((meals.length / 500) * 100, 100)
    },
  },
  {
    key: 'milestone_50_workouts',
    type: 'milestone',
    title: 'Fitness Enthusiast',
    description: 'Logged 50 workouts',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      return exercises.length >= 50
    },
    progress: async (userData) => {
      const exercises = await getExercises()
      return Math.min((exercises.length / 50) * 100, 100)
    },
  },
  {
    key: 'milestone_100_workouts',
    type: 'milestone',
    title: 'Fitness Master',
    description: 'Logged 100 workouts',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      return exercises.length >= 100
    },
    progress: async (userData) => {
      const exercises = await getExercises()
      return Math.min((exercises.length / 100) * 100, 100)
    },
  },
  {
    key: 'milestone_500_workouts',
    type: 'milestone',
    title: 'Fitness Legend',
    description: 'Logged 500 workouts',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      return exercises.length >= 500
    },
    progress: async (userData) => {
      const exercises = await getExercises()
      return Math.min((exercises.length / 500) * 100, 100)
    },
  },
  {
    key: 'milestone_first_weight',
    type: 'milestone',
    title: 'Weight Watcher',
    description: 'Logged your first weight entry',
    icon: null,
    condition: async (userData) => {
      try {
        const weightLogs = await getWeightLogs()
        return weightLogs.length > 0
      } catch {
        return false
      }
    },
  },
  {
    key: 'milestone_first_recipe',
    type: 'milestone',
    title: 'Recipe Creator',
    description: 'Created your first recipe',
    icon: null,
    condition: async (userData) => {
      try {
        const recipes = await getRecipes()
        return recipes.length > 0
      } catch {
        return false
      }
    },
  },
  {
    key: 'milestone_10_recipes',
    type: 'milestone',
    title: 'Recipe Collector',
    description: 'Created 10 recipes',
    icon: null,
    condition: async (userData) => {
      try {
        const recipes = await getRecipes()
        return recipes.length >= 10
      } catch {
        return false
      }
    },
    progress: async (userData) => {
      try {
        const recipes = await getRecipes()
        return Math.min((recipes.length / 10) * 100, 100)
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
  {
    key: 'special_high_protein_day',
    type: 'special',
    title: 'Protein Powerhouse',
    description: 'Consumed 200g+ protein in a single day',
    icon: null,
    condition: async (userData) => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const dailyLog = await getDailyLog(today)
      return dailyLog.protein >= 200
    },
  },
  {
    key: 'special_calorie_burn_500',
    type: 'special',
    title: 'Calorie Torch',
    description: 'Burned 500+ calories in a single workout',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      return exercises.some(e => e.calories_burned >= 500)
    },
  },
  {
    key: 'special_calorie_burn_1000',
    type: 'special',
    title: 'Calorie Inferno',
    description: 'Burned 1000+ calories in a single workout',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      return exercises.some(e => e.calories_burned >= 1000)
    },
  },
  {
    key: 'special_total_calories_burned_10k',
    type: 'special',
    title: '10K Burner',
    description: 'Burned 10,000 total calories from workouts',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      const totalBurned = exercises.reduce((sum, e) => sum + (e.calories_burned || 0), 0)
      return totalBurned >= 10000
    },
    progress: async (userData) => {
      const exercises = await getExercises()
      const totalBurned = exercises.reduce((sum, e) => sum + (e.calories_burned || 0), 0)
      return Math.min((totalBurned / 10000) * 100, 100)
    },
  },
  {
    key: 'special_total_calories_burned_50k',
    type: 'special',
    title: '50K Burner',
    description: 'Burned 50,000 total calories from workouts',
    icon: null,
    condition: async (userData) => {
      const exercises = await getExercises()
      const totalBurned = exercises.reduce((sum, e) => sum + (e.calories_burned || 0), 0)
      return totalBurned >= 50000
    },
    progress: async (userData) => {
      const exercises = await getExercises()
      const totalBurned = exercises.reduce((sum, e) => sum + (e.calories_burned || 0), 0)
      return Math.min((totalBurned / 50000) * 100, 100)
    },
  },
  {
    key: 'special_water_3l',
    type: 'special',
    title: 'Hydration Champion',
    description: 'Drank 3L+ water in a single day',
    icon: null,
    condition: async (userData) => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const dailyLog = await getDailyLog(today)
      return (dailyLog.water_intake_ml || 0) >= 3000
    },
  },
  {
    key: 'special_weight_loss_5kg',
    type: 'special',
    title: 'Weight Loss Warrior',
    description: 'Lost 5kg from your starting weight',
    icon: null,
    condition: async (userData) => {
      try {
        const weightLogs = await getWeightLogs()
        if (weightLogs.length < 2) return false
        const sorted = weightLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        const firstWeight = sorted[0].weight
        const latestWeight = sorted[sorted.length - 1].weight
        return (firstWeight - latestWeight) >= 5
      } catch {
        return false
      }
    },
  },
  {
    key: 'special_weight_gain_5kg',
    type: 'special',
    title: 'Muscle Builder',
    description: 'Gained 5kg from your starting weight',
    icon: null,
    condition: async (userData) => {
      try {
        const weightLogs = await getWeightLogs()
        if (weightLogs.length < 2) return false
        const sorted = weightLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        const firstWeight = sorted[0].weight
        const latestWeight = sorted[sorted.length - 1].weight
        return (latestWeight - firstWeight) >= 5
      } catch {
        return false
      }
    },
  },
  {
    key: 'special_balanced_macros_week',
    type: 'special',
    title: 'Macro Balancer',
    description: 'Met all macro goals (calories, protein, carbs, fats) for 7 days',
    icon: null,
    condition: async (userData) => {
      const { profile } = userData
      const calorieTarget = profile?.calorie_target || 2000
      const proteinTarget = profile?.protein_target || 150
      
      let balancedDays = 0
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dailyLog = await getDailyLog(date)
        // Check if calories and protein are within 10% of target
        const caloriesMet = Math.abs(dailyLog.calories_consumed - calorieTarget) <= (calorieTarget * 0.1)
        const proteinMet = dailyLog.protein >= proteinTarget * 0.9
        const hasCarbs = dailyLog.carbs > 0
        const hasFats = dailyLog.fats > 0
        
        if (caloriesMet && proteinMet && hasCarbs && hasFats) {
          balancedDays++
        } else {
          break
        }
      }
      return balancedDays >= 7
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
              } else if (definition.key === 'streak_14') {
                progress = Math.min((streakData.currentStreak / 14) * 100, 100)
              } else if (definition.key === 'streak_30') {
                progress = Math.min((streakData.currentStreak / 30) * 100, 100)
              } else if (definition.key === 'streak_60') {
                progress = Math.min((streakData.currentStreak / 60) * 100, 100)
              } else if (definition.key === 'streak_100') {
                progress = Math.min((streakData.currentStreak / 100) * 100, 100)
              } else if (definition.key === 'streak_365') {
                progress = Math.min((streakData.currentStreak / 365) * 100, 100)
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

