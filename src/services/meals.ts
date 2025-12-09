import { supabase } from '@/lib/supabase'
import { Meal } from '@/types'

export async function createMeal(meal: Omit<Meal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Meal> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Ensure required fields are present and properly formatted
  // Convert to integers as database expects INTEGER type, preserving exact values
  // Use Math.floor to ensure we don't round up (preserve user-entered values)
  const caloriesValue = Number(meal.calories) || 0
  const proteinValue = Number(meal.protein) || 0
  
  const mealData = {
    user_id: user.id,
    date: meal.date,
    calories: Number.isInteger(caloriesValue) ? caloriesValue : Math.floor(caloriesValue),
    protein: Number.isInteger(proteinValue) ? proteinValue : Math.floor(proteinValue),
    meal_type: meal.meal_type || null,
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
  return (data || []) as Meal[]
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

