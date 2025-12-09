import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '@/utils/logger'

/**
 * Hook to set up Supabase realtime subscriptions for automatic data updates
 * Automatically invalidates React Query cache when data changes
 */
export function useRealtimeSubscription(
  table: string,
  queryKeys: string[],
  filter?: string
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return

    // Create a channel for this table
    const channel: RealtimeChannel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          logger.debug(`[Realtime] ${table} changed:`, payload.eventType)
          
          // Invalidate all related queries to trigger refetch
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey: [queryKey] })
          })
        }
      )
      .subscribe()

    return () => {
      // Cleanup: unsubscribe when component unmounts
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, queryKeys, filter, queryClient])
}

/**
 * Hook for user-specific realtime subscriptions
 * Automatically filters by user_id from auth context
 */
export function useUserRealtimeSubscription(
  table: string,
  queryKeys: string[],
  userId: string | undefined
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured() || !userId) return

    // Create a channel filtered by user_id
    const channel: RealtimeChannel = supabase
      .channel(`${table}_user_${userId}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          logger.debug(`[Realtime] ${table} changed for user ${userId}:`, payload.eventType)
          
          // Invalidate all related queries
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey: [queryKey] })
          })
        }
      )
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, queryKeys, userId, queryClient])
}

