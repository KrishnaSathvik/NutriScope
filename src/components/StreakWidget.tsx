import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { calculateLoggingStreak } from '@/services/streak'
import { getUserStreak } from '@/services/streaks'
import { Zap, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { StreakData } from '@/services/streak'

/**
 * Get a motivational message based on streak length
 */
function getStreakMessage(streak: number): string {
  if (streak >= 100) return 'Century club!'
  if (streak >= 60) return 'Unstoppable legend!'
  if (streak >= 30) return 'Incredible!'
  if (streak >= 14) return 'Unstoppable!'
  if (streak >= 7) return 'On fire!'
  if (streak >= 3) return 'Building momentum!'
  if (streak >= 2) return 'Keep it up!'
  return 'Great start!'
}

export function StreakWidget() {
  const { user } = useAuth()
  const [showFallback, setShowFallback] = useState(false)
  
  // Get today's date string for cache invalidation
  const today = format(new Date(), 'yyyy-MM-dd')

  // Phase 2: Load cached streak data from DB if available
  const cachedStreakData = useMemo<StreakData | undefined>(() => {
    if (!user?.id) return undefined
    // Try to get from DB synchronously (will be async, but useQuery handles it)
    return undefined // Will be loaded via useQuery
  }, [user?.id])
  
  const { data: streakData, isLoading, error } = useQuery({
    queryKey: ['streak', user?.id, today], // Include date in query key so it refetches on new day
    queryFn: async () => {
      if (!user?.id) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastLoggedDate: null,
          isActive: false,
        }
      }
      
      // Phase 2: Try to get from DB first
      const dbStreak = await getUserStreak(user.id)
      if (dbStreak && dbStreak.lastLoggedDate) {
        const lastLogged = new Date(dbStreak.lastLoggedDate)
        const todayDate = new Date(today)
        const yesterdayDate = new Date(today)
        yesterdayDate.setDate(yesterdayDate.getDate() - 1)
        const daysDiff = Math.floor((todayDate.getTime() - lastLogged.getTime()) / (1000 * 60 * 60 * 24))
        // Use DB streak if it's from today or yesterday (streak might still be active)
        if (daysDiff <= 1 && dbStreak.currentStreak > 0) {
        return dbStreak
        }
      }
      
      // Calculate fresh streak (will also save to DB)
      const result = await calculateLoggingStreak()
      return result
    },
    enabled: !!user, // Only run if user exists (including guest users)
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch on mount to ensure fresh data
    refetchOnReconnect: true, // Refetch on reconnect
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    // Note: invalidateQueries will still trigger refetch even with staleTime: Infinity
    retry: 1,
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    // Use cached data immediately if available to avoid loading state
    placeholderData: (previousData) => previousData || cachedStreakData,
  })
  
  // Show fallback after 3 seconds if still loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowFallback(true)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setShowFallback(false)
    }
  }, [isLoading])
  
  // Default state component
  const DefaultState = () => (
    <div className="card-modern p-3 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-sm bg-amber-500/20 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/30 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider mb-1">Logging Streak</div>
          <div className="text-lg md:text-xl font-bold text-text font-mono">Start logging!</div>
        </div>
      </div>
      <div className="text-[10px] md:text-xs text-dim font-mono mt-2">
        Log meals, workouts, or water to start your streak
      </div>
    </div>
  )
  
  // If user doesn't exist, show default state
  if (!user) {
    return <DefaultState />
  }

  // Log errors for debugging
  if (error) {
    console.error('StreakWidget error:', error)
  }

  // Show widget even if there's an error (with default values)
  if (error && !streakData) {
    return <DefaultState />
  }

  // Show fallback state if loading takes too long
  if (isLoading && showFallback) {
    return <DefaultState />
  }

  // Prioritize fetched data (most up-to-date), fall back to cached only if no data yet
  // This ensures we show fresh data immediately after invalidation
  const displayData = streakData ?? cachedStreakData
  
  // Show loading state only if we have no cached data
  // If we have cached data, show it immediately even if fetching in background
  const hasNoData = !displayData
  
  if (isLoading && hasNoData) {
    return (
      <div className="card-modern p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center animate-pulse">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500" />
          </div>
          <div className="flex-1">
            <div className="h-3 bg-border rounded w-20 mb-1 animate-pulse" />
            <div className="h-4 bg-border rounded w-12 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!displayData || displayData.currentStreak === 0) {
    return (
      <div className="card-modern p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider mb-1">Logging Streak</div>
            <div className="text-lg md:text-xl font-bold text-text font-mono">Start logging!</div>
          </div>
        </div>
        <div className="text-[10px] md:text-xs text-dim font-mono mt-2">
          Log meals, workouts, or water to start your streak
        </div>
      </div>
    )
  }

  // Use displayData (either cached or fetched)
  const finalData = displayData!
  
  return (
    <div className="card-modern p-3 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-sm border flex items-center justify-center ${
          finalData.isActive 
            ? 'bg-amber-500/20 dark:bg-amber-500/20 border-amber-500/30 dark:border-amber-500/30 animate-pulse' 
            : 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/20'
        }`}>
          <Zap className={`w-4 h-4 ${finalData.isActive ? 'text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500' : 'text-amber-500/50 fill-amber-500/50 dark:text-amber-500/50 dark:fill-amber-500/50'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider mb-1">Logging Streak</div>
          <div className="text-lg md:text-xl font-bold text-acid font-mono">
            {finalData.currentStreak} {finalData.currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] md:text-xs text-dim font-mono flex items-center gap-1">
            {finalData.isActive ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-success" />
                <span className="text-success font-bold dark:font-normal">{getStreakMessage(finalData.currentStreak)}</span>
              </>
            ) : (
              <span className="text-dim">Keep it going!</span>
            )}
          </div>
        {finalData.longestStreak > finalData.currentStreak && (
          <div className="text-[10px] md:text-xs text-dim font-mono">
            Best: {finalData.longestStreak}
          </div>
        )}
      </div>
    </div>
  )
}


