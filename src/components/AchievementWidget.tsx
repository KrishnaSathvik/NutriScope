import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getUserAchievements, checkAndUnlockAchievements, getAchievementsWithProgress } from '@/services/achievements'
import { Achievement } from '@/types'
import AchievementBadge from './AchievementBadge'
import { Trophy, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function AchievementWidget() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: getUserAchievements,
    enabled: !!user,
  })

  // Check for new achievements periodically
  useEffect(() => {
    if (!user || !profile) return

    const checkAchievements = async () => {
      try {
        const newAchievements = await checkAndUnlockAchievements({ profile })
        if (newAchievements.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['achievements'] })
          // Could show a toast notification here
        }
      } catch (error) {
        console.error('Error checking achievements:', error)
      }
    }

    // Check immediately
    checkAchievements()

    // Check every 5 minutes
    const interval = setInterval(checkAchievements, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user, profile, queryClient])

  if (!user || achievements.length === 0) {
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

