import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { AlcoholLog } from '@/types'

/**
 * Standard drink equivalents (for reference)
 * 1 standard drink = 14g pure alcohol
 * - Beer (5%): 355ml = 1 drink
 * - Wine (12%): 148ml = 1 drink
 * - Spirits (40%): 44ml = 1 drink
 */

/**
 * Calculate calories from alcohol
 * Alcohol has ~7 calories per gram
 * Formula: (volume_ml * alcohol_content% / 100) * 7
 */
export function calculateAlcoholCalories(
  volumeMl: number,
  alcoholPercent: number
): number {
  const alcoholGrams = (volumeMl * alcoholPercent) / 100
  return Math.round(alcoholGrams * 7)
}

/**
 * Calculate standard drinks
 * 1 standard drink = 14g pure alcohol
 */
export function calculateStandardDrinks(
  volumeMl: number,
  alcoholPercent: number
): number {
  const alcoholGrams = (volumeMl * alcoholPercent) / 100
  return Math.round((alcoholGrams / 14) * 100) / 100 // Round to 2 decimal places
}

/**
 * Common drink types with default values
 */
export const DRINK_TYPES = {
  beer: {
    name: 'Beer',
    defaultAlcoholPercent: 5.0,
    defaultVolumeMl: 355, // 12 oz
  },
  wine: {
    name: 'Wine',
    defaultAlcoholPercent: 12.0,
    defaultVolumeMl: 148, // 5 oz
  },
  spirits: {
    name: 'Spirits',
    defaultAlcoholPercent: 40.0,
    defaultVolumeMl: 44, // 1.5 oz
  },
  cocktail: {
    name: 'Cocktail',
    defaultAlcoholPercent: 15.0,
    defaultVolumeMl: 200,
  },
  other: {
    name: 'Other',
    defaultAlcoholPercent: 0,
    defaultVolumeMl: 0,
  },
} as const

/**
 * Create alcohol log entry
 */
export async function createAlcoholLog(
  log: Omit<AlcoholLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<AlcoholLog> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Calculate calories if not provided
  let calories = log.calories || 0
  if (!log.calories && log.amount) {
    if (log.alcohol_content && log.alcohol_content > 0) {
      // Convert amount (standard drinks) to ml for calculation
      // 1 standard drink = 14g alcohol
      // For beer (5%): 1 drink = 355ml
      // For wine (12%): 1 drink = 148ml
      // For spirits (40%): 1 drink = 44ml
      const volumeMl = log.amount * 14 / (log.alcohol_content / 100)
      calories = calculateAlcoholCalories(volumeMl, log.alcohol_content)
    } else {
      // Fallback: Use average calories per standard drink if alcohol_content not provided
      // Average: ~120 calories per standard drink (varies by type)
      // Beer: ~150 cal, Wine: ~120 cal, Spirits: ~100 cal, Cocktail: ~150 cal
      const caloriesPerDrink: Record<string, number> = {
        beer: 150,
        wine: 120,
        spirits: 100,
        cocktail: 150,
        other: 120, // Default average
      }
      calories = Math.round(log.amount * (caloriesPerDrink[log.drink_type] || 120))
    }
  }

  const { data, error } = await supabase
    .from('alcohol_logs')
    .insert({
      user_id: user.id,
      date: log.date,
      time: log.time || null,
      drink_type: log.drink_type,
      drink_name: log.drink_name || null,
      amount: log.amount,
      alcohol_content: log.alcohol_content || null,
      calories: calories,
      notes: log.notes || null,
    })
    .select()
    .single()

  if (error) {
    handleSupabaseError(error, 'createAlcoholLog')
    throw error
  }

  // Update daily log alcohol count
  await updateDailyLogAlcohol(user.id, log.date)

  return data as AlcoholLog
}

/**
 * Get alcohol logs for a specific date
 */
export async function getAlcoholLogs(date: string): Promise<AlcoholLog[]> {
  if (isUsingDummyClient) {
    return []
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('alcohol_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: false })

  if (error) {
    handleSupabaseError(error, 'getAlcoholLogs')
    throw error
  }

  return (data || []) as AlcoholLog[]
}

/**
 * Get total alcohol drinks for a date
 */
export async function getTotalAlcoholDrinks(date: string): Promise<number> {
  const logs = await getAlcoholLogs(date)
  return logs.reduce((sum, log) => sum + log.amount, 0)
}

/**
 * Update alcohol log
 */
export async function updateAlcoholLog(
  id: string,
  updates: Partial<AlcoholLog>
): Promise<AlcoholLog> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Recalculate calories if amount or alcohol_content changed
  let calories = updates.calories
  if (updates.amount !== undefined || updates.alcohol_content !== undefined) {
    // Get current log to use existing values
    const { data: currentLog } = await supabase
      .from('alcohol_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (currentLog) {
      const amount = updates.amount ?? currentLog.amount
      const alcoholContent = updates.alcohol_content ?? currentLog.alcohol_content
      if (alcoholContent && amount) {
        const volumeMl = amount * 14 / (alcoholContent / 100)
        calories = calculateAlcoholCalories(volumeMl, alcoholContent)
      }
    }
  }

  const updateData: any = { ...updates }
  if (calories !== undefined) {
    updateData.calories = calories
  }
  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('alcohol_logs')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    handleSupabaseError(error, 'updateAlcoholLog')
    throw error
  }

  // Update daily log alcohol count
  if (updates.date) {
    await updateDailyLogAlcohol(user.id, updates.date)
  }

  return data as AlcoholLog
}

/**
 * Delete alcohol log
 */
export async function deleteAlcoholLog(id: string): Promise<void> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get log date before deleting
  const { data: log } = await supabase
    .from('alcohol_logs')
    .select('date')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('alcohol_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    handleSupabaseError(error, 'deleteAlcoholLog')
    throw error
  }

  // Update daily log alcohol count
  if (log) {
    await updateDailyLogAlcohol(user.id, log.date)
  }
}

/**
 * Update daily log alcohol drinks count
 */
async function updateDailyLogAlcohol(userId: string, date: string): Promise<void> {
  const totalDrinks = await getTotalAlcoholDrinks(date)

  // Get or create daily log
  const { data: existingLog } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (existingLog) {
    await supabase
      .from('daily_logs')
      .update({
        alcohol_drinks: totalDrinks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingLog.id)
  } else {
    await supabase.from('daily_logs').insert({
      user_id: userId,
      date,
      alcohol_drinks: totalDrinks,
      total_calories_consumed: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fats: 0,
      total_calories_burned: 0,
      water_intake_ml: 0,
    })
  }
}

