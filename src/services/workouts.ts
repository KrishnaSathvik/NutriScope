import { supabase } from '@/lib/supabase'
import { Exercise } from '@/types'

export async function createExercise(exercise: Omit<Exercise, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Exercise> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Preserve exact calorie values - only convert to integer if needed
  const caloriesBurnedValue = Number(exercise.calories_burned) || 0
  const exerciseData = {
    ...exercise,
    user_id: user.id,
    calories_burned: Number.isInteger(caloriesBurnedValue) ? caloriesBurnedValue : Math.floor(caloriesBurnedValue),
  }

  const { data, error } = await supabase
    .from('exercises')
    .insert(exerciseData)
    .select()
    .single()

  if (error) throw error
  return data as Exercise
}

export async function getExercises(date?: string): Promise<Exercise[]> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase.from('exercises').select('*').eq('user_id', user.id)
  
  if (date) {
    query = query.eq('date', date)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Exercise[]
}

export async function updateExercise(
  id: string,
  updates: Partial<Omit<Exercise, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Exercise> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Preserve exact calorie values
  const updateData: any = { ...updates }
  if (updateData.calories_burned !== undefined) {
    const caloriesValue = Number(updateData.calories_burned) || 0
    updateData.calories_burned = Number.isInteger(caloriesValue) ? caloriesValue : Math.floor(caloriesValue)
  }

  const { data, error } = await supabase
    .from('exercises')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Exercise
}

export async function deleteExercise(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

