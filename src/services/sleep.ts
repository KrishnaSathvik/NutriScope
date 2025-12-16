import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { SleepLog } from '@/types'

/**
 * Calculate sleep duration from bedtime and wake time
 * Handles overnight sleep (wake time next day)
 */
export function calculateSleepDuration(
  bedtime: string, // HH:mm format
  wakeTime: string // HH:mm format
): number {
  const [bedHour, bedMin] = bedtime.split(':').map(Number)
  const [wakeHour, wakeMin] = wakeTime.split(':').map(Number)
  
  const bedMinutes = bedHour * 60 + bedMin
  let wakeMinutes = wakeHour * 60 + wakeMin
  
  // If wake time is earlier than bedtime, assume next day
  if (wakeMinutes < bedMinutes) {
    wakeMinutes += 24 * 60 // Add 24 hours
  }
  
  const durationMinutes = wakeMinutes - bedMinutes
  const durationHours = durationMinutes / 60
  
  return Math.round(durationHours * 100) / 100 // Round to 2 decimal places
}

/**
 * Create sleep log entry
 */
export async function createSleepLog(
  log: Omit<SleepLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<SleepLog> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Calculate sleep duration if not provided but bedtime/wake_time are
  let sleepDuration = log.sleep_duration
  if (!sleepDuration && log.bedtime && log.wake_time) {
    sleepDuration = calculateSleepDuration(log.bedtime, log.wake_time)
  }

  if (!sleepDuration || sleepDuration <= 0) {
    throw new Error('Sleep duration must be greater than 0')
  }

  const { data, error } = await supabase
    .from('sleep_logs')
    .insert({
      user_id: user.id,
      date: log.date,
      bedtime: log.bedtime || null,
      wake_time: log.wake_time || null,
      sleep_duration: sleepDuration,
      sleep_quality: log.sleep_quality || null,
      notes: log.notes || null,
    })
    .select()
    .single()

  if (error) {
    handleSupabaseError(error, 'createSleepLog')
    throw error
  }

  // Update daily log sleep hours
  await updateDailyLogSleep(user.id, log.date)

  return data as SleepLog
}

/**
 * Get sleep logs for a specific date
 */
export async function getSleepLogs(date: string): Promise<SleepLog[]> {
  if (isUsingDummyClient) {
    return []
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: false })

  if (error) {
    handleSupabaseError(error, 'getSleepLogs')
    throw error
  }

  return (data || []) as SleepLog[]
}

/**
 * Get sleep log for a specific date (single entry)
 */
export async function getSleepLog(date: string): Promise<SleepLog | null> {
  const logs = await getSleepLogs(date)
  return logs.length > 0 ? logs[0] : null
}

/**
 * Get total sleep hours for a date
 */
export async function getTotalSleepHours(date: string): Promise<number | null> {
  const log = await getSleepLog(date)
  return log ? log.sleep_duration : null
}

/**
 * Update sleep log
 */
export async function updateSleepLog(
  id: string,
  updates: Partial<SleepLog>
): Promise<SleepLog> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Recalculate sleep duration if bedtime or wake_time changed
  let sleepDuration = updates.sleep_duration
  if (updates.bedtime !== undefined || updates.wake_time !== undefined) {
    // Get current log to use existing values
    const { data: currentLog } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (currentLog) {
      const bedtime = updates.bedtime ?? currentLog.bedtime
      const wakeTime = updates.wake_time ?? currentLog.wake_time
      if (bedtime && wakeTime) {
        sleepDuration = calculateSleepDuration(bedtime, wakeTime)
      }
    }
  }

  const updateData: any = { ...updates }
  if (sleepDuration !== undefined) {
    updateData.sleep_duration = sleepDuration
  }
  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('sleep_logs')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    handleSupabaseError(error, 'updateSleepLog')
    throw error
  }

  // Update daily log sleep hours
  if (updates.date) {
    await updateDailyLogSleep(user.id, updates.date)
  }

  return data as SleepLog
}

/**
 * Delete sleep log
 */
export async function deleteSleepLog(id: string): Promise<void> {
  if (isUsingDummyClient) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get log date before deleting
  const { data: log } = await supabase
    .from('sleep_logs')
    .select('date')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('sleep_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    handleSupabaseError(error, 'deleteSleepLog')
    throw error
  }

  // Update daily log sleep hours
  if (log) {
    await updateDailyLogSleep(user.id, log.date)
  }
}

/**
 * Update daily log sleep hours
 */
async function updateDailyLogSleep(userId: string, date: string): Promise<void> {
  const sleepLog = await getSleepLog(date)
  const sleepHours = sleepLog ? sleepLog.sleep_duration : null

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
        sleep_hours: sleepHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingLog.id)
  } else {
    await supabase.from('daily_logs').insert({
      user_id: userId,
      date,
      sleep_hours: sleepHours,
      total_calories_consumed: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fats: 0,
      total_calories_burned: 0,
      water_intake_ml: 0,
    })
  }
}

/**
 * Get sleep logs for a date range
 */
export async function getSleepLogsRange(
  startDate: string,
  endDate: string
): Promise<SleepLog[]> {
  if (isUsingDummyClient) {
    return []
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    handleSupabaseError(error, 'getSleepLogsRange')
    throw error
  }

  return (data || []) as SleepLog[]
}

