import { supabase } from '@/lib/supabase'
import { Meal } from '@/types'

export async function createMeal(meal: Omit<Meal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Meal> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Ensure required fields are present and properly formatted
  // Round to integers as database expects INTEGER type
  const mealData = {
    user_id: user.id,
    date: meal.date,
    calories: Math.round(meal.calories || 0),
    protein: Math.round(meal.protein || 0),
    meal_type: meal.meal_type || null,
    name: meal.name || null,
    carbs: meal.carbs ? Math.round(meal.carbs) : null,
    fats: meal.fats ? Math.round(meal.fats) : null,
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

  const { data, error } = await supabase
    .from('meals')
    .update({
      ...updates,
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

