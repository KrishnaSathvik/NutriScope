import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { getAchievementsWithProgress } from '@/services/achievements'
import AchievementBadge from '@/components/AchievementBadge'
import PullToRefresh from '@/components/PullToRefresh'
import { Trophy, Target, Award, Star } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function AchievementsPage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [showFallback, setShowFallback] = useState(false)
  
  // Get today's date string for cache invalidation
  const today = format(new Date(), 'yyyy-MM-dd')
  const cacheKey = `achievements_${user?.id}_${today}`

  // Subscribe to achievements table changes to catch newly unlocked achievements
  // Also invalidate 'achievements' query key since getAchievementsWithProgress calls getUserAchievements internally
  useUserRealtimeSubscription('achievements', ['achievementsWithProgress', 'achievements'], user?.id)

  // Load cached data from localStorage if available
  const getCachedAchievements = () => {
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
  }

  const { data: achievements = [], isLoading, isFetching, error } = useQuery({
    queryKey: ['achievementsWithProgress', user?.id, today], // Include date in query key
    queryFn: async () => {
      const result = await getAchievementsWithProgress({ profile })
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
    enabled: !!user && !!profile,
    refetchOnWindowFocus: true, // Refetch on window focus to catch newly unlocked achievements
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
    refetchOnReconnect: true, // Refetch on reconnect
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    retry: 1,
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    // Use cached data from localStorage immediately as placeholder
    placeholderData: (previousData) => previousData || getCachedAchievements(),
  })
  
  // Show fallback after 5 seconds if still loading (achievements take longer)
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowFallback(true)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowFallback(false)
    }
  }, [isLoading])

  // Effect to update localStorage when achievements change
  useEffect(() => {
    if (achievements.length > 0 && user) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: achievements,
          date: today,
          timestamp: Date.now(),
        }))
      } catch (e) {
        // localStorage might be full, ignore
      }
    }
  }, [achievements, user, today, cacheKey])

  const achievementsByType = {
    streak: achievements.filter(a => a.type === 'streak'),
    goal: achievements.filter(a => a.type === 'goal'),
    milestone: achievements.filter(a => a.type === 'milestone'),
    special: achievements.filter(a => a.type === 'special'),
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  // Check if we have no data (for showing loading state)
  const hasNoData = achievements.length === 0 && !error

  // Show loading state only if we have no data at all (first load)
  // If we have cached data, show it immediately even if fetching in background
  if (isLoading && hasNoData && !showFallback) {
    return (
      <PullToRefresh onRefresh={async () => {}} disabled={!user}>
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-6">
          <div className="border-b border-border pb-4 md:pb-6">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="h-px w-6 md:w-8 bg-acid"></div>
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                  {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">
                Achievements
              </h1>
            </div>
          </div>
          <div className="card-modern p-8 text-center">
            <div className="animate-pulse space-y-4">
              <Trophy className="w-12 h-12 mx-auto text-acid/50" />
              <div className="h-4 bg-border rounded w-32 mx-auto"></div>
              <div className="h-3 bg-border rounded w-24 mx-auto"></div>
            </div>
          </div>
        </div>
      </PullToRefresh>
    )
  }

  // Show error or empty state if loading took too long
  if (isLoading && hasNoData && showFallback) {
    return (
      <PullToRefresh onRefresh={async () => {}} disabled={!user}>
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-6">
          <div className="border-b border-border pb-4 md:pb-6">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="h-px w-6 md:w-8 bg-acid"></div>
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                  {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">
                Achievements
              </h1>
            </div>
          </div>
          <div className="card-modern p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-acid/50 mb-4" />
            <p className="text-dim font-mono text-sm">
              Loading achievements...
            </p>
            <p className="text-dim font-mono text-xs mt-2">
              This may take a moment
            </p>
          </div>
        </div>
      </PullToRefresh>
    )
  }

  const handleRefresh = async () => {
    // Clear localStorage cache for today
    if (user?.id) {
      try {
        localStorage.removeItem(cacheKey)
      } catch (e) {
        // Ignore errors
      }
    }
    // Invalidate and refetch achievements (both query keys)
    await queryClient.invalidateQueries({ queryKey: ['achievementsWithProgress'] })
    await queryClient.invalidateQueries({ queryKey: ['achievements'] }) // Also invalidate getUserAchievements cache
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={!user}>
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4 md:pb-6">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div className="h-px w-6 md:w-8 bg-acid"></div>
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">
                Achievements
              </h1>
              <div className="text-right">
                <div className="text-xl md:text-2xl font-bold text-acid font-mono">
                  {unlockedCount} / {totalCount}
                </div>
                <div className="text-[10px] md:text-xs text-dim font-mono uppercase">
                  Unlocked
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="card-modern p-3 md:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim">Overall Progress</span>
            <span className="text-xs md:text-sm font-bold text-acid font-mono">{Math.round((unlockedCount / totalCount) * 100)}%</span>
          </div>
          <div className="relative w-full bg-border h-2 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-orange-500 dark:bg-cyan-500 transition-all duration-1000"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-dim font-mono text-xs">Loading achievements...</div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Streak Achievements */}
            {achievementsByType.streak.length > 0 && (
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  <Trophy className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                  <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                    Streak Achievements
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                {achievementsByType.streak.map((achievement) => (
                  <AchievementBadge
                    key={achievement.key}
                    achievement={{
                      id: achievement.key,
                      user_id: user?.id || '',
                      achievement_type: achievement.type,
                      achievement_key: achievement.key,
                      title: achievement.title,
                      description: achievement.description,
                      icon: achievement.icon,
                      unlocked_at: achievement.unlocked ? new Date().toISOString() : '',
                      progress: achievement.progress,
                    }}
                    size="sm"
                    showProgress={!achievement.unlocked}
                  />
                ))}
                </div>
              </div>
            )}

            {/* Goal Achievements */}
            {achievementsByType.goal.length > 0 && (
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                  <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                    Goal Achievements
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                {achievementsByType.goal.map((achievement) => (
                  <AchievementBadge
                    key={achievement.key}
                    achievement={{
                      id: achievement.key,
                      user_id: user?.id || '',
                      achievement_type: achievement.type,
                      achievement_key: achievement.key,
                      title: achievement.title,
                      description: achievement.description,
                      icon: achievement.icon,
                      unlocked_at: achievement.unlocked ? new Date().toISOString() : '',
                      progress: achievement.progress,
                    }}
                    size="sm"
                    showProgress={!achievement.unlocked}
                  />
                ))}
                </div>
              </div>
            )}

            {/* Milestone Achievements */}
            {achievementsByType.milestone.length > 0 && (
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  <Award className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                  <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                    Milestone Achievements
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                {achievementsByType.milestone.map((achievement) => (
                  <AchievementBadge
                    key={achievement.key}
                    achievement={{
                      id: achievement.key,
                      user_id: user?.id || '',
                      achievement_type: achievement.type,
                      achievement_key: achievement.key,
                      title: achievement.title,
                      description: achievement.description,
                      icon: achievement.icon,
                      unlocked_at: achievement.unlocked ? new Date().toISOString() : '',
                      progress: achievement.progress,
                    }}
                    size="sm"
                    showProgress={!achievement.unlocked}
                  />
                ))}
                </div>
              </div>
            )}

            {/* Special Achievements */}
            {achievementsByType.special.length > 0 && (
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  <Star className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                  <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                    Special Achievements
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                {achievementsByType.special.map((achievement) => (
                  <AchievementBadge
                    key={achievement.key}
                    achievement={{
                      id: achievement.key,
                      user_id: user?.id || '',
                      achievement_type: achievement.type,
                      achievement_key: achievement.key,
                      title: achievement.title,
                      description: achievement.description,
                      icon: achievement.icon,
                      unlocked_at: achievement.unlocked ? new Date().toISOString() : '',
                      progress: achievement.progress,
                    }}
                    size="sm"
                    showProgress={!achievement.unlocked}
                  />
                ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}

