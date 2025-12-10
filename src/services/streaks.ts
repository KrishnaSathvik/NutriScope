import { supabase } from '@/lib/supabase'
import { StreakData } from './streak'
import { handleSupabaseError } from '@/lib/errors'

/**
 * Get user streak data from database
 */
export async function getUserStreak(userId: string): Promise<StreakData | null> {
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'getUserStreak')
      return null
    }

    if (!data) {
      return null
    }

    return {
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0,
      lastLoggedDate: data.last_log_date || null,
      isActive: data.last_log_date === new Date().toISOString().split('T')[0], // Check if last log was today
    }
  } catch (error) {
    console.error('Error getting user streak:', error)
    return null
  }
}

/**
 * Update user streak data in database
 */
export async function updateUserStreak(
  userId: string,
  streakData: StreakData
): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    const { error } = await supabase
      .from('user_streaks')
      .upsert({
        user_id: userId,
        current_streak: streakData.currentStreak,
        longest_streak: streakData.longestStreak,
        last_log_date: streakData.lastLoggedDate,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      handleSupabaseError(error, 'updateUserStreak')
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating user streak:', error)
    return false
  }
}

