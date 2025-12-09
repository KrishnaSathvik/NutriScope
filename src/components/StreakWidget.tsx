import { useQuery } from '@tanstack/react-query'
import { calculateLoggingStreak } from '@/services/streak'
import { Flame, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function StreakWidget() {
  const { user } = useAuth()
  
  const { data: streakData, isLoading, error } = useQuery({
    queryKey: ['streak', user?.id],
    queryFn: calculateLoggingStreak,
    enabled: !!user, // Only run if user exists (including guest users)
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
  
  // If user doesn't exist, show default state
  if (!user) {
    return (
      <div className="card-modern border-acid/30 p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center">
            <Flame className="w-4 h-4 text-acid" />
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

  // Log errors for debugging
  if (error) {
    console.error('StreakWidget error:', error)
  }

  // Show widget even if there's an error (with default values)
  if (error && !streakData) {
    return (
      <div className="card-modern border-acid/30 p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center">
            <Flame className="w-4 h-4 text-acid" />
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

  // Show loading state briefly, then show default if taking too long
  if (isLoading) {
    return (
      <div className="card-modern border-acid/30 p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center animate-pulse">
            <Flame className="w-4 h-4 text-acid" />
          </div>
          <div className="flex-1">
            <div className="h-3 bg-border rounded w-20 mb-1 animate-pulse" />
            <div className="h-4 bg-border rounded w-12 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!streakData || streakData.currentStreak === 0) {
    return (
      <div className="card-modern border-acid/30 p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center">
            <Flame className="w-4 h-4 text-acid" />
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

  return (
    <div className="card-modern border-acid/30 p-3 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-sm border flex items-center justify-center ${
          streakData.isActive 
            ? 'bg-acid/20 border-acid/30 animate-pulse' 
            : 'bg-acid/10 border-acid/20'
        }`}>
          <Flame className={`w-4 h-4 ${streakData.isActive ? 'text-acid' : 'text-acid/50'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider mb-1">Logging Streak</div>
          <div className="text-lg md:text-xl font-bold text-acid font-mono">
            {streakData.currentStreak} {streakData.currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] md:text-xs text-dim font-mono flex items-center gap-1">
            {streakData.isActive ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-success" />
                <span className="text-success font-bold dark:font-normal">On fire!</span>
              </>
            ) : (
              <span className="text-dim">Keep it going!</span>
            )}
          </div>
        {streakData.longestStreak > streakData.currentStreak && (
          <div className="text-[10px] md:text-xs text-dim font-mono">
            Best: {streakData.longestStreak}
          </div>
        )}
      </div>
    </div>
  )
}

