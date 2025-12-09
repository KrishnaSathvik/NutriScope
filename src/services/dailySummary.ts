import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'

/**
 * Update daily log with new values
 */
export async function updateDailyLog(
  userId: string,
  date: string,
  updates: {
    water_intake_ml?: number
    total_calories_consumed?: number
    total_protein?: number
    total_carbs?: number
    total_fats?: number
    total_calories_burned?: number
  }
): Promise<boolean> {
  if (isUsingDummyClient) {
    console.log('Using dummy client - skipping daily log update')
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

    if (existingLog) {
      // Update existing log
      const { error } = await supabase
        .from('daily_logs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLog.id)

      if (error) {
        handleSupabaseError(error, 'updateDailyLog')
        throw error
      }
    } else {
      // Create new log
      const { error } = await supabase.from('daily_logs').insert({
        user_id: userId,
        date,
        water_intake_ml: updates.water_intake_ml || 0,
        total_calories_consumed: updates.total_calories_consumed || 0,
        total_protein: updates.total_protein || 0,
        total_carbs: updates.total_carbs || 0,
        total_fats: updates.total_fats || 0,
        total_calories_burned: updates.total_calories_burned || 0,
      })

      if (error) {
        handleSupabaseError(error, 'updateDailyLog')
        throw error
      }
    }

    return true
  } catch (error) {
    console.error('Error updating daily log:', error)
    return false
  }
}

