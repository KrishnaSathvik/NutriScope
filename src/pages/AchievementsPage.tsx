import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getAchievementsWithProgress } from '@/services/achievements'
import AchievementBadge from '@/components/AchievementBadge'
import PullToRefresh from '@/components/PullToRefresh'
import { format } from 'date-fns'
import { Trophy, Target, Award, Star } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function AchievementsPage() {
  const { user, profile } = useAuth()

  // Set up realtime subscriptions for achievements
  useUserRealtimeSubscription('achievements', ['achievementsWithProgress'], user?.id)
  useUserRealtimeSubscription('meals', ['achievementsWithProgress'], user?.id)
  useUserRealtimeSubscription('exercises', ['achievementsWithProgress'], user?.id)
  useUserRealtimeSubscription('daily_logs', ['achievementsWithProgress'], user?.id)

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievementsWithProgress', user?.id],
    queryFn: () => getAchievementsWithProgress({ profile }),
    enabled: !!user && !!profile,
  })

  const achievementsByType = {
    streak: achievements.filter(a => a.type === 'streak'),
    goal: achievements.filter(a => a.type === 'goal'),
    milestone: achievements.filter(a => a.type === 'milestone'),
    special: achievements.filter(a => a.type === 'special'),
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  return (
    <PullToRefresh onRefresh={async () => {}} disabled={!user}>
      <div className="space-y-4 md:space-y-6 px-3 md:px-0 pb-20 md:pb-0">
        {/* Header */}
        <div className="border-b border-border pb-4 md:pb-6 px-3 md:px-0 -mx-3 md:mx-0">
          <div className="px-3 md:px-0">
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
              className="absolute top-0 left-0 h-full bg-success dark:bg-cyan-500 transition-all duration-1000"
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

