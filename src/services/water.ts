import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { updateDailyLog } from './dailySummary'
import { handleSupabaseError } from '@/lib/errors'

/**
 * Default water intake goal (2000ml = 2L)
 */
export const DEFAULT_WATER_GOAL_ML = 2000

/**
 * Add water intake for a specific date
 */
export async function addWaterIntake(
  userId: string,
  date: string,
  amountMl: number
): Promise<boolean> {
  if (isUsingDummyClient) {
    console.log('Using dummy client - skipping water intake')
    return false
  }

  try {
    // Get current daily log
    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()

    const currentWater = existingLog?.water_intake_ml || 0
    const newWater = currentWater + amountMl

    if (existingLog) {
      // Update existing log
      const { error } = await supabase
        .from('daily_logs')
        .update({
          water_intake_ml: newWater,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLog.id)

      if (error) {
        handleSupabaseError(error, 'addWaterIntake')
        throw error
      }
    } else {
      // Create new log with water intake
      const { error } = await supabase.from('daily_logs').insert({
        user_id: userId,
        date,
        water_intake_ml: newWater,
        total_calories_consumed: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fats: 0,
        total_calories_burned: 0,
      })

      if (error) {
        handleSupabaseError(error, 'addWaterIntake')
        throw error
      }
    }

    return true
  } catch (error) {
    console.error('Error adding water intake:', error)
    return false
  }
}

/**
 * Get water intake for a specific date
 */
export async function getWaterIntake(
  userId: string,
  date: string
): Promise<number> {
  if (isUsingDummyClient) {
    return 0
  }

  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('water_intake_ml')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()

    if (error) {
      const { isNotFound } = handleSupabaseError(error, 'getWaterIntake')
      if (isNotFound) {
        return 0
      }
      throw error
    }

    return data?.water_intake_ml || 0
  } catch (error) {
    console.error('Error getting water intake:', error)
    return 0
  }
}

// Legacy function names for backward compatibility
export async function logWater(amount: number, containerType?: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  return addWaterIntake(user.id, today, amount)
}

export async function getWaterLogs(date?: string): Promise<number> {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  return getWaterIntake(user.id, targetDate)
}

