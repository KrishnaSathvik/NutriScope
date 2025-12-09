import { supabase } from '@/lib/supabase'
import { Exercise } from '@/types'

export async function createExercise(exercise: Omit<Exercise, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Exercise> {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      ...exercise,
      user_id: user.id,
    })
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

  const { data, error } = await supabase
    .from('exercises')
    .update({
      ...updates,
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

