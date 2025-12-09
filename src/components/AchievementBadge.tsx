import { Achievement } from '@/types'
import { Trophy, Award, Target, Star, Flame, UtensilsCrossed, Dumbbell, Calendar, Zap, CheckCircle2 } from 'lucide-react'

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
}

const iconMap = {
  streak: Trophy,
  goal: Target,
  milestone: Award,
  special: Star,
}

// Specific icons for different achievement keys
const achievementIconMap: Record<string, any> = {
  'streak_7': Flame,
  'streak_30': Trophy,
  'streak_100': Trophy,
  'goal_calorie_5': Target,
  'goal_protein_7': Target,
  'milestone_first_meal': UtensilsCrossed,
  'milestone_first_workout': Dumbbell,
  'milestone_10_meals': UtensilsCrossed,
  'milestone_10_workouts': Dumbbell,
  'milestone_30_days': Calendar,
  'special_perfect_week': Zap,
}

export default function AchievementBadge({ 
  achievement, 
  size = 'md',
  showProgress = false 
}: AchievementBadgeProps) {
  // Use specific icon for achievement key, or fallback to type-based icon
  const SpecificIcon = achievementIconMap[achievement.achievement_key]
  const IconComponent = SpecificIcon || iconMap[achievement.achievement_type] || Trophy
  
  const sizeClasses = {
    sm: 'w-full h-auto min-h-[100px] text-xs',
    md: 'w-full h-auto min-h-[120px] text-sm',
    lg: 'w-full h-auto min-h-[140px] text-base',
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className="relative group">
      <div className={`
        ${sizeClasses[size]}
        card-modern
        flex flex-col items-center justify-center
        p-2 md:p-3
        border-acid/30
        hover:border-acid
        transition-all
        cursor-pointer
        relative overflow-hidden
      `}>
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-acid/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Icon */}
        <div className="relative z-10 flex items-center justify-center mb-2">
          <IconComponent className={`${iconSizeClasses[size]} text-acid`} />
        </div>
        
        {/* Title */}
        <div className="relative z-10 text-center w-full px-1">
          <div className={`font-mono font-bold text-text uppercase tracking-wider ${size === 'sm' ? 'text-[10px] leading-tight' : 'text-xs'}`} title={achievement.title}>
            {achievement.title}
          </div>
        </div>
        
        {/* Description (for small badges, show on hover) */}
        {size === 'sm' && achievement.description && (
          <div className="relative z-10 text-center w-full px-1 mt-1">
            <div className="text-[8px] text-dim font-mono leading-tight line-clamp-2">
              {achievement.description}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {showProgress && achievement.progress !== undefined && achievement.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-border">
            <div
              className="h-full bg-success dark:bg-amber-500 transition-all duration-300"
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
        )}

        {/* Unlocked indicator - Visible tick icon or dot */}
        {(achievement.progress === 100 || (achievement.unlocked_at && achievement.unlocked_at.trim() !== '')) && (
          <div className="absolute top-1 right-1 z-20">
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-success dark:text-acid fill-success dark:fill-acid/20" />
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="card-modern p-2 md:p-3 min-w-[200px] border-acid/50 bg-surface">
          <div className="text-xs md:text-sm font-bold text-text font-mono uppercase mb-1">
            {achievement.title}
          </div>
          {achievement.description && (
            <div className="text-[10px] md:text-xs text-dim font-mono">
              {achievement.description}
            </div>
          )}
          {showProgress && achievement.progress !== undefined && achievement.progress < 100 && (
            <div className="mt-2 text-[10px] text-acid font-mono">
              {achievement.progress}% complete
            </div>
          )}
          {(achievement.progress === 100 || (achievement.unlocked_at && achievement.unlocked_at.trim() !== '')) && (
            <div className="mt-2 text-[10px] text-success font-mono">
              ✓ Unlocked
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

