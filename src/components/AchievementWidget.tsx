import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { getUserAchievements, checkAndUnlockAchievements, getAchievementsWithProgress } from '@/services/achievements'
import { Achievement } from '@/types'
import AchievementBadge from './AchievementBadge'
import { Trophy, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AchievementWidget() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showFallback, setShowFallback] = useState(false)
  
  // Get today's date string for cache invalidation
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: achievements = [], isLoading, error } = useQuery({
    queryKey: ['achievements', user?.id, today], // Include date in query key
    queryFn: getUserAchievements,
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if data exists for today
    staleTime: Infinity, // Data is fresh until date changes
    retry: 1,
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
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

  // Check for new achievements periodically (only if not loading)
  useEffect(() => {
    if (!user || !profile || isLoading) return

    const checkAchievements = async () => {
      try {
        const newAchievements = await checkAndUnlockAchievements({ profile })
        if (newAchievements.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['achievements'] })
          queryClient.invalidateQueries({ queryKey: ['achievementsWithProgress'] })
          // Could show a toast notification here
        }
      } catch (error) {
        console.error('Error checking achievements:', error)
      }
    }

    // Check after a delay to avoid blocking initial load
    const timer = setTimeout(checkAchievements, 2000)
    
    // Check every 5 minutes
    const interval = setInterval(checkAchievements, 5 * 60 * 1000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [user, profile, queryClient, isLoading])

  // Show fallback if loading takes too long
  if (isLoading && showFallback) {
    return null // Hide widget if loading takes too long
  }

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className="card-modern p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3 mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 animate-pulse">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-acid" />
          </div>
          <div className="flex-1">
            <div className="h-3 bg-border rounded w-24 mb-1 animate-pulse" />
            <div className="h-2 bg-border rounded w-16 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!user || (achievements.length === 0 && !error)) {
    return null
  }

  // Show latest 3 achievements
  const recentAchievements = achievements.slice(0, 3)

  return (
    <div className="card-modern p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-acid" />
          </div>
          <div>
            <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
              Achievements
            </h2>
            <div className="text-[10px] md:text-xs text-dim font-mono">
              {achievements.length} unlocked
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/achievements')}
          className="text-acid hover:opacity-80 transition-colors"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {recentAchievements.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {recentAchievements.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              size="sm"
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-xs text-dim font-mono">
            Start logging to unlock achievements!
          </div>
        </div>
      )}
    </div>
  )
}

