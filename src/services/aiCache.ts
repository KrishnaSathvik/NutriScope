import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'

export type AICacheType = 'coach_tip' | 'daily_insight'

export interface AICacheEntry {
  id: string
  user_id: string
  cache_type: AICacheType
  date: string
  tip_index: number | null
  content: string
  data_signature: string | null
  created_at: string
}

/**
 * Get AI cache entry from database
 */
export async function getAICache(
  userId: string,
  cacheType: AICacheType,
  date: string,
  tipIndex?: number
): Promise<string | null> {
  if (!supabase) {
    return null
  }

  try {
    let query = supabase
      .from('user_ai_cache')
      .select('content, data_signature')
      .eq('user_id', userId)
      .eq('cache_type', cacheType)
      .eq('date', date)

    if (tipIndex !== undefined) {
      query = query.eq('tip_index', tipIndex)
    } else {
      query = query.is('tip_index', null)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      handleSupabaseError(error, 'getAICache')
      return null
    }

    return data?.content || null
  } catch (error) {
    console.error('Error getting AI cache:', error)
    return null
  }
}

/**
 * Save AI cache entry to database
 */
export async function saveAICache(
  userId: string,
  cacheType: AICacheType,
  date: string,
  content: string,
  tipIndex?: number,
  dataSignature?: string
): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    // Use upsert - PostgreSQL will use the unique indexes we created
    // For coach_tip: conflicts on (user_id, cache_type, date, tip_index)
    // For daily_insight: conflicts on (user_id, cache_type, date) where tip_index IS NULL
    const { error } = await supabase
      .from('user_ai_cache')
      .upsert({
        user_id: userId,
        cache_type: cacheType,
        date,
        tip_index: tipIndex ?? null,
        content,
        data_signature: dataSignature ?? null,
      })

    if (error) {
      handleSupabaseError(error, 'saveAICache')
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving AI cache:', error)
    return false
  }
}

/**
 * Delete AI cache entries for a specific date (cleanup old cache)
 */
export async function deleteAICache(
  userId: string,
  cacheType: AICacheType,
  date: string,
  tipIndex?: number
): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    let query = supabase
      .from('user_ai_cache')
      .delete()
      .eq('user_id', userId)
      .eq('cache_type', cacheType)
      .eq('date', date)

    if (tipIndex !== undefined) {
      query = query.eq('tip_index', tipIndex)
    } else {
      query = query.is('tip_index', null)
    }

    const { error } = await query

    if (error) {
      handleSupabaseError(error, 'deleteAICache')
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting AI cache:', error)
    return false
  }
}

/**
 * Get AI cache with signature validation (for daily insights)
 */
export async function getAICacheWithSignature(
  userId: string,
  cacheType: AICacheType,
  date: string,
  expectedSignature: string
): Promise<string | null> {
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_ai_cache')
      .select('content, data_signature')
      .eq('user_id', userId)
      .eq('cache_type', cacheType)
      .eq('date', date)
      .is('tip_index', null)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'getAICacheWithSignature')
      return null
    }

    // Verify signature matches
    if (data?.data_signature === expectedSignature) {
      return data.content
    }

    // Signature mismatch - delete stale cache
    if (data) {
      await deleteAICache(userId, cacheType, date)
    }

    return null
  } catch (error) {
    console.error('Error getting AI cache with signature:', error)
    return null
  }
}

