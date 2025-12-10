import { supabase } from '@/lib/supabase'
import { MealPlan, PlannedMeal } from '@/types'
import { startOfWeek, format, addDays, parseISO } from 'date-fns'

/**
 * Get meal plan for a specific week
 */
export async function getMealPlan(weekStartDate: string): Promise<MealPlan | null> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start_date', weekStartDate)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    // Handle 406 Not Acceptable - table might not exist
    if (error.code === 'PGRST301' || error.status === 406) {
      console.warn('meal_plans table may not exist. Please run the migration script in Supabase SQL Editor.')
      return null
    }
    console.error('Error fetching meal plan:', error)
    throw new Error('Failed to fetch meal plan')
  }

  return data
}

/**
 * Get or create meal plan for current week
 */
export async function getCurrentWeekMealPlan(): Promise<MealPlan> {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const existing = await getMealPlan(weekStart)
  
  if (existing) {
    return existing
  }

  // Create new meal plan for the week
  return await createMealPlan(weekStart)
}

/**
 * Create a new meal plan
 */
export async function createMealPlan(weekStartDate: string): Promise<MealPlan> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: user.id,
      week_start_date: weekStartDate,
      planned_meals: {},
    })
    .select()
    .single()

  if (error) {
    // Handle 406 Not Acceptable - table might not exist
    if (error.code === 'PGRST301' || error.status === 406) {
      console.error('meal_plans table may not exist. Please run add_meal_plans_schema.sql in Supabase SQL Editor.')
      throw new Error('Meal plans table not found. Please contact support.')
    }
    console.error('Error creating meal plan:', error)
    throw new Error('Failed to create meal plan')
  }

  return data
}

/**
 * Update meal plan
 */
export async function updateMealPlan(
  planId: string,
  updates: Partial<Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<MealPlan> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .update(updates)
    .eq('id', planId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    // Handle 406 Not Acceptable - table might not exist
    if (error.code === 'PGRST301' || error.status === 406) {
      console.error('meal_plans table may not exist. Please run add_meal_plans_schema.sql in Supabase SQL Editor.')
      throw new Error('Meal plans table not found. Please contact support.')
    }
    console.error('Error updating meal plan:', error)
    throw new Error('Failed to update meal plan')
  }

  return data
}

/**
 * Add meal to plan
 */
export async function addMealToPlan(
  planId: string,
  day: string, // 'monday', 'tuesday', etc.
  meal: PlannedMeal
): Promise<MealPlan> {
  const plan = await getMealPlanById(planId)
  if (!plan) {
    throw new Error('Meal plan not found')
  }

  const plannedMeals = plan.planned_meals || {}
  const dayMeals = plannedMeals[day] || []
  
  const updatedMeals = {
    ...plannedMeals,
    [day]: [...dayMeals, meal],
  }

  return await updateMealPlan(planId, { planned_meals: updatedMeals })
}

/**
 * Remove meal from plan
 */
export async function removeMealFromPlan(
  planId: string,
  day: string,
  mealIndex: number
): Promise<MealPlan> {
  const plan = await getMealPlanById(planId)
  if (!plan) {
    throw new Error('Meal plan not found')
  }

  const plannedMeals = plan.planned_meals || {}
  const dayMeals = plannedMeals[day] || []
  
  const updatedMeals = {
    ...plannedMeals,
    [day]: dayMeals.filter((_, idx) => idx !== mealIndex),
  }

  return await updateMealPlan(planId, { planned_meals: updatedMeals })
}

/**
 * Get meal plan by ID
 */
async function getMealPlanById(planId: string): Promise<MealPlan | null> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    // Handle 406 Not Acceptable - table might not exist
    if (error.code === 'PGRST301' || error.status === 406) {
      console.warn('meal_plans table may not exist. Please run the migration script in Supabase SQL Editor.')
      return null
    }
    console.error('Error fetching meal plan:', error)
    throw new Error('Failed to fetch meal plan')
  }

  return data
}

/**
 * Get week days (Monday-Sunday)
 */
export function getWeekDays(weekStartDate: string): Array<{ day: string; date: string; label: string }> {
  const start = parseISO(weekStartDate)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  
  return days.map((day, idx) => ({
    day,
    date: format(addDays(start, idx), 'yyyy-MM-dd'),
    label: format(addDays(start, idx), 'EEE, MMM d'),
  }))
}

