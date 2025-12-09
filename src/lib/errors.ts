import { PostgrestError } from '@supabase/supabase-js'
import { logger } from '@/utils/logger'

/**
 * Handle Supabase errors with consistent logging and error detection
 */
export function handleSupabaseError(
  error: PostgrestError | Error,
  context: string
): { isNotFound: boolean; isUnauthorized: boolean } {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorCode = (error as any)?.code || (error as any)?.status

  logger.error(`[${context}] Supabase error:`, {
    message: errorMessage,
    code: errorCode,
    error,
  })

  const isNotFound =
    errorCode === 'PGRST116' ||
    errorMessage.includes('not found') ||
    errorMessage.includes('No rows') ||
    errorCode === 404

  const isUnauthorized =
    errorCode === 'PGRST301' ||
    errorMessage.includes('permission denied') ||
    errorCode === 401 ||
    errorCode === 403

  return { isNotFound, isUnauthorized }
}

