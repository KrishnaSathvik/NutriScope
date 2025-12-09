import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { calculateLoggingStreak } from '@/services/streak'
import { Zap, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { StreakData } from '@/services/streak'

export function StreakWidget() {
  const { user } = useAuth()
  const [showFallback, setShowFallback] = useState(false)
  
  // Get today's date string for cache invalidation
  const today = format(new Date(), 'yyyy-MM-dd')
  const cacheKey = `streak_${user?.id}_${today}`

  // Load cached streak data from localStorage if available (useMemo to compute once)
  const cachedStreakData = useMemo<StreakData | undefined>(() => {
    if (!user?.id) return undefined
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        // Check if cache is from today
        if (parsed.date === today && parsed.data) {
          return parsed.data
        }
      }
    } catch (e) {
      // Invalid cache, ignore
    }
    return undefined
  }, [user?.id, cacheKey, today])
  
  const { data: streakData, isLoading, error } = useQuery({
    queryKey: ['streak', user?.id, today], // Include date in query key so it refetches on new day
    queryFn: async () => {
      const result = await calculateLoggingStreak()
      // Cache in localStorage
      if (user?.id && result) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: result,
            date: today,
            timestamp: Date.now(),
          }))
        } catch (e) {
          // localStorage might be full, ignore
        }
      }
      return result
    },
    enabled: !!user, // Only run if user exists (including guest users)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if data exists for today
    refetchOnReconnect: false, // Don't refetch on reconnect
    staleTime: Infinity, // Data is fresh until date changes (handled by query key)
    // Note: invalidateQueries will still trigger refetch even with staleTime: Infinity
    retry: 1,
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    // Use cached data from localStorage immediately - this prevents loading state
    ...(cachedStreakData ? { initialData: cachedStreakData } : {}),
    // Use cached data immediately if available to avoid loading state
    placeholderData: (previousData) => previousData || cachedStreakData,
  })
  
  // Update localStorage when streakData changes (after refetch)
  useEffect(() => {
    if (streakData && user?.id) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: streakData,
          date: today,
          timestamp: Date.now(),
        }))
      } catch (e) {
        // localStorage might be full, ignore
      }
    }
  }, [streakData, user?.id, cacheKey, today])
  
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
    <div className="card-modern border-amber-500/30 dark:border-acid/30 p-3 md:p-4">
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
      <div className="card-modern border-amber-500/30 dark:border-acid/30 p-3 md:p-4">
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
      <div className="card-modern border-amber-500/30 dark:border-acid/30 p-3 md:p-4">
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
    <div className="card-modern border-amber-500/30 dark:border-acid/30 p-3 md:p-4">
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
                <span className="text-success font-bold dark:font-normal">On fire!</span>
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

