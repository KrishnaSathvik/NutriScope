import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'

export interface ExerciseLibraryItem {
  id: string
  name: string
  type: 'cardio' | 'strength' | 'yoga' | 'sports' | 'other'
  met_value: number
  muscle_groups: string[]
  equipment: string[]
  instructions?: string
  video_url?: string
  image_url?: string
  created_at: string
}

/**
 * Search exercises in library
 */
export async function searchExercises(query: string): Promise<ExerciseLibraryItem[]> {
  if (isUsingDummyClient) {
    // Return sample data for development
    return getSampleExercises().filter(ex => 
      ex.name.toLowerCase().includes(query.toLowerCase())
    )
  }

  try {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(50)

    if (error) {
      handleSupabaseError(error, 'searchExercises')
      throw error
    }

    return (data as ExerciseLibraryItem[]) || []
  } catch (error) {
    console.error('Error searching exercises:', error)
    return []
  }
}

/**
 * Get exercise by ID
 */
export async function getExercise(exerciseId: string): Promise<ExerciseLibraryItem | null> {
  if (isUsingDummyClient) {
    return getSampleExercises().find(ex => ex.id === exerciseId) || null
  }

  try {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('id', exerciseId)
      .single()

    if (error) {
      const { isNotFound } = handleSupabaseError(error, 'getExercise')
      if (isNotFound) return null
      throw error
    }

    return data as ExerciseLibraryItem
  } catch (error) {
    console.error('Error getting exercise:', error)
    return null
  }
}

/**
 * Get exercises by type
 */
export async function getExercisesByType(
  type: ExerciseLibraryItem['type']
): Promise<ExerciseLibraryItem[]> {
  if (isUsingDummyClient) {
    return getSampleExercises().filter(ex => ex.type === type)
  }

  try {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('type', type)
      .order('name')
      .limit(100)

    if (error) {
      handleSupabaseError(error, 'getExercisesByType')
      throw error
    }

    return (data as ExerciseLibraryItem[]) || []
  } catch (error) {
    console.error('Error getting exercises by type:', error)
    return []
  }
}

/**
 * Get exercises by muscle group
 */
export async function getExercisesByMuscleGroup(
  muscleGroup: string
): Promise<ExerciseLibraryItem[]> {
  if (isUsingDummyClient) {
    return getSampleExercises().filter(ex => 
      ex.muscle_groups.includes(muscleGroup)
    )
  }

  try {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .contains('muscle_groups', [muscleGroup])
      .order('name')
      .limit(100)

    if (error) {
      handleSupabaseError(error, 'getExercisesByMuscleGroup')
      throw error
    }

    return (data as ExerciseLibraryItem[]) || []
  } catch (error) {
    console.error('Error getting exercises by muscle group:', error)
    return []
  }
}

/**
 * Calculate calories burned using METs formula
 * Formula: Calories = METs × Weight (kg) × Duration (hours)
 */
export function calculateCaloriesBurned(
  metValue: number,
  weightKg: number,
  durationMinutes: number
): number {
  const durationHours = durationMinutes / 60
  return Math.round(metValue * weightKg * durationHours)
}

/**
 * Get popular/recommended exercises
 */
export async function getPopularExercises(): Promise<ExerciseLibraryItem[]> {
  if (isUsingDummyClient) {
    return getSampleExercises().slice(0, 20)
  }

  try {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .order('name')
      .limit(20)

    if (error) {
      handleSupabaseError(error, 'getPopularExercises')
      throw error
    }

    return (data as ExerciseLibraryItem[]) || []
  } catch (error) {
    console.error('Error getting popular exercises:', error)
    return []
  }
}

/**
 * Sample exercises for development/dummy client
 */
function getSampleExercises(): ExerciseLibraryItem[] {
  return [
    {
      id: '1',
      name: 'Running, 6 mph (10 min/mile)',
      type: 'cardio',
      met_value: 9.8,
      muscle_groups: ['legs', 'core', 'cardiovascular'],
      equipment: [],
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Running, 8 mph (7.5 min/mile)',
      type: 'cardio',
      met_value: 11.5,
      muscle_groups: ['legs', 'core', 'cardiovascular'],
      equipment: [],
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Cycling, moderate effort',
      type: 'cardio',
      met_value: 6.0,
      muscle_groups: ['legs', 'cardiovascular'],
      equipment: ['bicycle'],
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Push-ups, moderate effort',
      type: 'strength',
      met_value: 3.8,
      muscle_groups: ['chest', 'triceps', 'shoulders'],
      equipment: [],
      created_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Squats, bodyweight',
      type: 'strength',
      met_value: 5.0,
      muscle_groups: ['legs', 'glutes'],
      equipment: [],
      created_at: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'Yoga, Vinyasa',
      type: 'yoga',
      met_value: 4.0,
      muscle_groups: ['full body', 'flexibility'],
      equipment: ['mat'],
      created_at: new Date().toISOString(),
    },
    {
      id: '7',
      name: 'Basketball, general',
      type: 'sports',
      met_value: 8.0,
      muscle_groups: ['full body'],
      equipment: [],
      created_at: new Date().toISOString(),
    },
    {
      id: '8',
      name: 'Swimming, freestyle, moderate',
      type: 'cardio',
      met_value: 8.3,
      muscle_groups: ['full body', 'cardiovascular'],
      equipment: [],
      created_at: new Date().toISOString(),
    },
  ]
}

