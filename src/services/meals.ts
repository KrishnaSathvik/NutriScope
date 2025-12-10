import { supabase } from '@/lib/supabase'
import { Meal, MealType } from '@/types'

/**
 * Normalize meal_type to match database constraint
 * Maps common values to database-expected values
 */
function normalizeMealType(mealType: string | undefined | null, context?: { name?: string; description?: string }): MealType | null {
  if (!mealType) return null
  
  const normalized = mealType.toLowerCase().trim()
  
  // Check context for "evening" keyword to determine snack type
  const hasEveningContext = context 
    ? (context.name?.toLowerCase().includes('evening') || context.description?.toLowerCase().includes('evening'))
    : normalized.includes('evening')
  
  // Map common values to database values
  const mapping: Record<string, MealType> = {
    'pre_breakfast': 'pre_breakfast',
    'breakfast': 'breakfast',
    'morning_snack': 'morning_snack',
    'morning snack': 'morning_snack',
    'morning': 'morning_snack',
    'lunch': 'lunch',
    'evening_snack': 'evening_snack',
    'evening snack': 'evening_snack',
    'evening': 'evening_snack',
    'dinner': 'dinner',
    'post_dinner': 'post_dinner',
    'post dinner': 'post_dinner',
    // Fallback mappings for common variations
    'snack': hasEveningContext ? 'evening_snack' : 'morning_snack', // Smart default based on context
    'brunch': 'breakfast',
    'supper': 'dinner',
  }
  
  return mapping[normalized] || null
}

export async function createMeal(meal: Omit<Meal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Meal> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Ensure required fields are present and properly formatted
  // Convert to integers as database expects INTEGER type, preserving exact values
  // Use Math.floor to ensure we don't round up (preserve user-entered values)
  const caloriesValue = Number(meal.calories) || 0
  const proteinValue = Number(meal.protein) || 0
  
  // Normalize meal_type to match database constraint (use context for smart snack detection)
  // Pass both name and meal_type as context to help detect "evening" in snack detection
  const normalizedMealType = normalizeMealType(meal.meal_type, {
    name: meal.name,
    description: meal.name || meal.meal_type, // Use name or meal_type as description context
  })
  
  const mealData = {
    user_id: user.id,
    date: meal.date,
    calories: Number.isInteger(caloriesValue) ? caloriesValue : Math.floor(caloriesValue),
    protein: Number.isInteger(proteinValue) ? proteinValue : Math.floor(proteinValue),
    meal_type: normalizedMealType,
    name: meal.name || null,
    carbs: meal.carbs !== undefined && meal.carbs !== null 
      ? (Number.isInteger(Number(meal.carbs)) ? Number(meal.carbs) : Math.floor(Number(meal.carbs)))
      : null,
    fats: meal.fats !== undefined && meal.fats !== null 
      ? (Number.isInteger(Number(meal.fats)) ? Number(meal.fats) : Math.floor(Number(meal.fats)))
      : null,
    food_items: meal.food_items || [],
    time: meal.time || null,
    notes: meal.notes || null,
    image_url: meal.image_url || null,
  }

  const { data, error } = await supabase
    .from('meals')
    .insert(mealData)
    .select()
    .single()

  if (error) {
    console.error('Meal creation error:', error)
    throw error
  }
  return data as Meal
}

/**
 * Meal type ordering for proper display
 * Meals should be displayed in this order: pre_breakfast, breakfast, morning_snack, lunch, evening_snack, dinner, post_dinner
 */
const MEAL_TYPE_ORDER: Record<MealType | string, number> = {
  'pre_breakfast': 1,
  'breakfast': 2,
  'morning_snack': 3,
  'lunch': 4,
  'evening_snack': 5,
  'dinner': 6,
  'post_dinner': 7,
}

export async function getMeals(date?: string): Promise<Meal[]> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase.from('meals').select('*').eq('user_id', user.id)
  
  if (date) {
    query = query.eq('date', date)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  
  // Sort meals by meal_type order, then by time, then by created_at
  const sortedMeals = (data || []).sort((a, b) => {
    const aType = a.meal_type || ''
    const bType = b.meal_type || ''
    
    // First, sort by meal_type order
    const aOrder = MEAL_TYPE_ORDER[aType] || 999
    const bOrder = MEAL_TYPE_ORDER[bType] || 999
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder
    }
    
    // If same meal_type, sort by time
    if (a.time && b.time) {
      return a.time.localeCompare(b.time)
    }
    if (a.time) return -1
    if (b.time) return 1
    
    // Finally, sort by created_at (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  
  return sortedMeals as Meal[]
}

export async function updateMeal(
  id: string,
  updates: Partial<Omit<Meal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Meal> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Preserve exact calorie values - only convert to integer if needed
  const updateData: any = { ...updates }
  
  // Normalize meal_type if provided
  if (updateData.meal_type !== undefined) {
    updateData.meal_type = normalizeMealType(updateData.meal_type)
  }
  
  if (updateData.calories !== undefined) {
    const caloriesValue = Number(updateData.calories) || 0
    updateData.calories = Number.isInteger(caloriesValue) ? caloriesValue : Math.floor(caloriesValue)
  }
  if (updateData.protein !== undefined) {
    const proteinValue = Number(updateData.protein) || 0
    updateData.protein = Number.isInteger(proteinValue) ? proteinValue : Math.floor(proteinValue)
  }
  if (updateData.carbs !== undefined && updateData.carbs !== null) {
    const carbsValue = Number(updateData.carbs)
    updateData.carbs = Number.isInteger(carbsValue) ? carbsValue : Math.floor(carbsValue)
  }
  if (updateData.fats !== undefined && updateData.fats !== null) {
    const fatsValue = Number(updateData.fats)
    updateData.fats = Number.isInteger(fatsValue) ? fatsValue : Math.floor(fatsValue)
  }

  const { data, error } = await supabase
    .from('meals')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Meal
}

export async function deleteMeal(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

