import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight: number // in kg
  body_fat_percentage?: number
  muscle_mass?: number // in kg
  notes?: string
  created_at: string
  updated_at: string
}

export interface WeightEntry {
  date: string
  weight: number
  body_fat_percentage?: number
  muscle_mass?: number
  notes?: string
}

/**
 * Calculate BMI from weight and height
 */
export function calculateBMI(weightKg: number, heightCm: number | null | undefined): number | null {
  if (!heightCm || heightCm <= 0) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number | null): string | null {
  if (bmi === null) return null
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  return 'obese'
}

/**
 * Get BMI category label and color
 */
export function getBMICategoryInfo(bmi: number | null): { label: string; color: string; description: string } {
  const category = getBMICategory(bmi)
  
  switch (category) {
    case 'underweight':
      return {
        label: 'Underweight',
        color: 'text-blue-400',
        description: 'BMI < 18.5'
      }
    case 'normal':
      return {
        label: 'Normal',
        color: 'text-success',
        description: 'BMI 18.5 - 24.9'
      }
    case 'overweight':
      return {
        label: 'Overweight',
        color: 'text-warning',
        description: 'BMI 25 - 29.9'
      }
    case 'obese':
      return {
        label: 'Obese',
        color: 'text-error',
        description: 'BMI ≥ 30'
      }
    default:
      return {
        label: 'Unknown',
        color: 'text-dim',
        description: 'Unable to calculate'
      }
  }
}

/**
 * Create or update a weight log entry
 * Uses UPSERT to update if a weight log already exists for the same date
 */
export async function createWeightLog(entry: WeightEntry): Promise<WeightLog> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('weight_logs')
    .upsert({
      user_id: user.id,
      ...entry,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date',
    })
    .select()
    .single()

  if (error) {
    handleSupabaseError(error, 'createWeightLog')
    throw error
  }

  return data as WeightLog
}

/**
 * Update a weight log entry
 */
export async function updateWeightLog(logId: string, updates: Partial<WeightEntry>): Promise<WeightLog> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('weight_logs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    handleSupabaseError(error, 'updateWeightLog')
    throw error
  }

  return data as WeightLog
}

/**
 * Delete a weight log entry
 */
export async function deleteWeightLog(logId: string): Promise<void> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('weight_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', user.id)

  if (error) {
    handleSupabaseError(error, 'deleteWeightLog')
    throw error
  }
}

/**
 * Get weight logs for a date range
 */
export async function getWeightLogs(
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<WeightLog[]> {
  if (isUsingDummyClient) {
    return []
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    handleSupabaseError(error, 'getWeightLogs')
    throw error
  }

  return (data || []) as WeightLog[]
}

/**
 * Get latest weight log
 */
export async function getLatestWeight(): Promise<WeightLog | null> {
  const logs = await getWeightLogs(undefined, undefined, 1)
  return logs.length > 0 ? logs[0] : null
}

/**
 * Get weight change over a period
 */
export async function getWeightChange(daysBack: number = 7): Promise<number | null> {
  const logs = await getWeightLogs(undefined, undefined, 100)
  
  if (logs.length < 2) return null

  const latest = logs[0]
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  const previous = logs.find(log => new Date(log.date) <= cutoffDate)
  
  if (!previous) return null

  return Math.round((latest.weight - previous.weight) * 10) / 10
}

/**
 * Get weight statistics
 */
export async function getWeightStats(daysBack: number = 30): Promise<{
  current: number | null
  previous: number | null
  change: number | null
  average: number | null
  min: number | null
  max: number | null
}> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)
  const startDate = cutoffDate.toISOString().split('T')[0]

  const logs = await getWeightLogs(startDate)

  if (logs.length === 0) {
    return {
      current: null,
      previous: null,
      change: null,
      average: null,
      min: null,
      max: null,
    }
  }

  const weights = logs.map(log => log.weight)
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    current: logs[0]?.weight || null,
    previous: sortedLogs[0]?.weight || null,
    change: logs.length > 0 && sortedLogs.length > 0
      ? Math.round((logs[0].weight - sortedLogs[0].weight) * 10) / 10
      : null,
    average: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
    min: Math.min(...weights),
    max: Math.max(...weights),
  }
}

