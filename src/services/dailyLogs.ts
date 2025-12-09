import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { DailyLog } from '@/types'
import { getWaterIntake } from './water'
import { handleSupabaseError } from '@/lib/errors'

export async function getDailyLog(date: string): Promise<DailyLog> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get meals with error handling
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: false })

  if (mealsError) {
    handleSupabaseError(mealsError, 'getDailyLog-meals')
    throw new Error('Failed to fetch meals')
  }

  // Get exercises with error handling
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: false })

  if (exercisesError) {
    handleSupabaseError(exercisesError, 'getDailyLog-exercises')
    throw new Error('Failed to fetch exercises')
  }

  // Get water intake from daily_logs table
  const water_intake = await getWaterIntake(user.id, date)

  const calories_consumed = meals?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0
  const calories_burned = exercises?.reduce((sum, ex) => sum + (ex.calories_burned || 0), 0) || 0
  const protein = meals?.reduce((sum, meal) => sum + (meal.protein || 0), 0) || 0
  const carbs = meals?.reduce((sum, meal) => sum + (meal.carbs || 0), 0) || 0
  const fats = meals?.reduce((sum, meal) => sum + (meal.fats || 0), 0) || 0

  return {
    date,
    calories_consumed,
    calories_burned,
    net_calories: calories_consumed - calories_burned,
    protein,
    carbs,
    fats,
    water_intake,
    meals: meals || [],
    exercises: exercises || [],
    water_logs: [], // Empty array for backward compatibility
  }
}

