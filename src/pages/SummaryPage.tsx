import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getDailyLog } from '@/services/dailyLogs'
import { generateDailyInsights } from '@/services/aiInsights'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle2, Droplet, Flame, Activity, Cookie, Beef, Circle, UtensilsCrossed } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { formatOptionalNutrition, stripMarkdown } from '@/utils/format'

export default function SummaryPage() {
  const { date } = useParams<{ date: string }>()
  const dateStr = date || format(new Date(), 'yyyy-MM-dd')
  const { profile, user } = useAuth()

  // Set up realtime subscriptions for summary data
  useUserRealtimeSubscription('meals', ['dailyLog', 'aiInsights'], user?.id)
  useUserRealtimeSubscription('exercises', ['dailyLog', 'aiInsights'], user?.id)
  useUserRealtimeSubscription('daily_logs', ['dailyLog', 'aiInsights'], user?.id)

  const { data: dailyLog, isLoading } = useQuery({
    queryKey: ['dailyLog', dateStr],
    queryFn: () => getDailyLog(dateStr),
  })

  // Create a data signature/hash to detect changes
  const dataSignature = useMemo(() => {
    if (!dailyLog) return null
    // Create a signature based on key data points
    return JSON.stringify({
      calories: dailyLog.calories_consumed,
      protein: dailyLog.protein,
      water: dailyLog.water_intake,
      caloriesBurned: dailyLog.calories_burned,
      mealsCount: dailyLog.meals.length,
      workoutsCount: dailyLog.exercises.length,
      // Include meal IDs and workout IDs to detect additions/deletions
      mealIds: dailyLog.meals.map(m => m.id).sort(),
      workoutIds: dailyLog.exercises.map(e => e.id).sort(),
    })
  }, [dailyLog])

  // Use React Query to cache insights based on data signature with DB persistence
  const { data: aiInsight, isLoading: loadingInsight } = useQuery({
    queryKey: ['aiInsights', dateStr, dataSignature],
    queryFn: async () => {
      if (!dailyLog || !dataSignature || !user?.id) return null
      
      // Phase 3: Try to get from DB first (with signature validation)
      const { getAICacheWithSignature, saveAICache, deleteAICache } = await import('@/services/aiCache')
      const cachedInsight = await getAICacheWithSignature(
        user.id,
        'daily_insight',
        dateStr,
        dataSignature
      )
      
      // Don't use cached error messages - regenerate if cached insight is an error
      const errorMessages = [
        'AI insights are temporarily unavailable',
        'Unable to generate insights',
        'AI insights are not available',
      ]
      const isError = cachedInsight && errorMessages.some(msg => cachedInsight.includes(msg))
      
      if (cachedInsight && !isError) {
        return cachedInsight
      }
      
      // If cached insight is an error, delete it and regenerate
      if (isError) {
        await deleteAICache(user.id, 'daily_insight', dateStr)
      }
      
      // Generate new insight
      const insight = await generateDailyInsights(dailyLog, profile, user.id)
      
      // Phase 3: Save to DB with signature (but don't save error messages)
      if (insight && !errorMessages.some(msg => insight.includes(msg))) {
        await saveAICache(
          user.id,
          'daily_insight',
          dateStr,
          insight,
          undefined, // No tip_index for daily insights
          dataSignature
        )
      }
      
      return insight
    },
    enabled: !!dailyLog && !!dataSignature && !!user?.id,
    staleTime: 0, // Always refetch when queryKey changes (signature changes)
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })

  if (isLoading) {
    return (
      <div className="text-center py-12 text-dim font-mono text-xs">Loading summary...</div>
    )
  }

  if (!dailyLog) {
    return (
      <div className="text-center py-12 text-dim font-mono text-xs">No data found for this date</div>
    )
  }

  const calorieTarget = profile?.calorie_target || 2000
  const proteinTarget = profile?.protein_target || 150
  const waterGoal = profile?.water_goal || 2000
  
  const calorieProgress = Math.min((dailyLog?.calories_consumed || 0) / calorieTarget * 100, 100)
  const proteinProgress = Math.min((dailyLog?.protein || 0) / proteinTarget * 100, 100)
  const waterProgress = Math.min((dailyLog?.water_intake || 0) / waterGoal * 100, 100)

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      <div className="border-b border-border pb-4 md:pb-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="h-px w-6 md:w-8 bg-acid"></div>
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
              {format(new Date(dateStr), 'EEEE, MMMM d, yyyy').toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">Daily Summary</h1>
        </div>
      </div>

      {/* AI Insights */}
      {dailyLog && (
        <div className="card-modern border-acid/30 bg-gradient-to-br from-surface to-panel p-4 md:p-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-acid" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 md:mb-3">
                <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">AI Insights</h2>
                <span className="text-[10px] md:text-xs text-acid font-mono bg-acid/10 px-2 py-0.5 md:py-1 rounded-sm border border-acid/20 self-start">
                  Powered by AI
                </span>
              </div>
              {loadingInsight ? (
                <div className="flex items-center gap-2 text-dim font-mono text-xs md:text-sm">
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-acid border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  <span>Analyzing your day...</span>
                </div>
              ) : aiInsight ? (
                <>
                  <p className="text-xs md:text-sm text-text font-mono leading-relaxed break-words mb-2">{stripMarkdown(aiInsight)}</p>
                  <p className="text-[9px] md:text-[10px] text-dim/70 font-mono italic">
                    Insights update automatically when you log new meals or workouts
                  </p>
                </>
              ) : (
                <p className="text-xs md:text-sm text-dim font-mono">Unable to generate insights at this time.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {/* Calories */}
        <div className="card-modern border-orange-500/30 dark:border-acid/30 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
            <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500 flex-shrink-0" />
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Calories</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-orange-500 dark:text-text font-mono mb-1">
            {dailyLog?.calories_consumed || 0}
          </div>
          <div className="text-[10px] md:text-xs text-dim font-mono mb-1 md:mb-2">
            / {calorieTarget} target
          </div>
          <div className="relative w-full bg-border h-1 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-orange-500 dark:bg-orange-500 transition-all duration-1000"
              style={{ width: `${calorieProgress}%` }}
            />
          </div>
          {dailyLog && (
            <div className="mt-1.5 md:mt-2 flex items-center gap-1 text-[10px] md:text-xs font-mono">
              {dailyLog.calories_consumed >= calorieTarget ? (
                <>
                  <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-success flex-shrink-0" />
                  <span className="text-success truncate">Target met</span>
                </>
              ) : (
                <>
                  <Target className="w-2.5 h-2.5 md:w-3 md:h-3 text-dim flex-shrink-0" />
                  <span className="text-dim truncate">{calorieTarget - dailyLog.calories_consumed} remaining</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Protein */}
        <div className="card-modern border-emerald-500/30 dark:border-acid/30 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
            <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 fill-emerald-500 dark:text-emerald-500 dark:fill-emerald-500 flex-shrink-0" />
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Protein</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-emerald-500 dark:text-text font-mono mb-1">
            {dailyLog?.protein || 0}g
          </div>
          <div className="text-[10px] md:text-xs text-dim font-mono mb-1 md:mb-2">
            / {proteinTarget}g target
          </div>
          <div className="relative w-full bg-border h-1 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-emerald-500 dark:bg-emerald-500 transition-all duration-1000"
              style={{ width: `${proteinProgress}%` }}
            />
          </div>
          {dailyLog && (
            <div className="mt-1.5 md:mt-2 flex items-center gap-1 text-[10px] md:text-xs font-mono">
              {dailyLog.protein >= proteinTarget ? (
                <>
                  <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-success flex-shrink-0" />
                  <span className="text-success truncate">Target met</span>
                </>
              ) : (
                <>
                  <Target className="w-2.5 h-2.5 md:w-3 md:h-3 text-dim flex-shrink-0" />
                  <span className="text-dim truncate">{proteinTarget - dailyLog.protein}g remaining</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Water */}
        <div className="card-modern border-blue-500/30 dark:border-acid/30 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
            <Droplet className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500 flex-shrink-0" />
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Water</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-blue-500 dark:text-text font-mono mb-1">
            {dailyLog?.water_intake || 0}ml
          </div>
          <div className="text-[10px] md:text-xs text-dim font-mono mb-1 md:mb-2">
            / {waterGoal}ml goal
          </div>
          <div className="relative w-full bg-border h-1 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 dark:bg-blue-500 transition-all duration-1000"
              style={{ width: `${waterProgress}%` }}
            />
          </div>
          {dailyLog && (
            <div className="mt-1.5 md:mt-2 flex items-center gap-1 text-[10px] md:text-xs font-mono">
              {dailyLog.water_intake >= waterGoal ? (
                <>
                  <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-success flex-shrink-0" />
                  <span className="text-success truncate">Goal met</span>
                </>
              ) : (
                <>
                  <Droplet className="w-2.5 h-2.5 md:w-3 md:h-3 text-dim flex-shrink-0" />
                  <span className="text-dim truncate">{waterGoal - dailyLog.water_intake}ml remaining</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="card-modern border-purple-500/30 dark:border-acid/30 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500 flex-shrink-0" />
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Activity</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-purple-500 dark:text-text font-mono mb-1">
            {dailyLog?.calories_burned || 0}
          </div>
          <div className="text-[10px] md:text-xs text-dim font-mono mb-1 md:mb-2">
            calories burned
          </div>
          <div className="text-[10px] md:text-xs text-dim font-mono">
            {dailyLog?.exercises.length || 0} workout{(dailyLog?.exercises.length || 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Additional Macros */}
        <div className="card-modern p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Additional Macros</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-center py-2.5 md:py-3 border-b border-border">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Cookie className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-yellow-500 dark:text-yellow-500 dark:fill-yellow-500 flex-shrink-0" />
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase">Carbs</span>
              </div>
              <span className="font-bold text-yellow-500 dark:text-text font-mono text-base md:text-lg">
                {formatOptionalNutrition(dailyLog.carbs)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 md:py-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Circle className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500 flex-shrink-0" />
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase">Fats</span>
              </div>
              <span className="font-bold text-amber-500 dark:text-text font-mono text-base md:text-lg">
                {formatOptionalNutrition(dailyLog.fats)}
              </span>
            </div>
          </div>
        </div>

        {/* Calorie Balance */}
        <div className="card-modern p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-acid flex-shrink-0" />
            <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Calorie Balance</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-center py-2.5 md:py-3 border-b border-border">
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase">Calories Burned</span>
              <span className="font-bold text-purple-500 dark:text-acid font-mono text-base md:text-lg">{dailyLog.calories_burned}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 md:py-3 border-b border-border">
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase">Net Calories</span>
              <div className="flex items-center gap-1.5 md:gap-2">
                {dailyLog.net_calories > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-success flex-shrink-0" />
                ) : dailyLog.net_calories < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-error flex-shrink-0" />
                ) : (
                  <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-text flex-shrink-0" />
                )}
                <span className={`font-bold font-mono text-base md:text-lg ${
                  dailyLog.net_calories > 0 
                    ? 'text-success' 
                    : dailyLog.net_calories < 0 
                    ? 'text-error' 
                    : 'text-text'
                }`}>
                  {dailyLog.net_calories > 0 ? '+' : ''}
                  {dailyLog.net_calories}
                </span>
              </div>
            </div>
            <div className="pt-2 md:pt-3 border-t border-border">
              <div className="flex items-center justify-between text-[10px] md:text-xs font-mono mb-1.5 md:mb-2">
                <span className="text-dim">Balance Status</span>
                <span className={`font-bold ${
                  dailyLog.net_calories > 0 
                    ? 'text-success' 
                    : dailyLog.net_calories < 0 
                    ? 'text-error' 
                    : 'text-acid'
                }`}>
                  {dailyLog.net_calories > 0 
                    ? 'Surplus' 
                    : dailyLog.net_calories < 0 
                    ? 'Deficit' 
                    : 'Balanced'}
                </span>
              </div>
              <div className="relative w-full bg-border h-2 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-1000 ${
                    dailyLog.net_calories > 0 
                      ? 'bg-success' 
                      : dailyLog.net_calories < 0 
                      ? 'bg-error' 
                      : 'bg-acid'
                  }`}
                  style={{ width: `${Math.min(Math.abs(dailyLog.net_calories) / calorieTarget * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meals */}
      {dailyLog.meals.length > 0 && (
        <div className="card-modern p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5 text-acid flex-shrink-0" />
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Meals ({dailyLog.meals.length})</h2>
            </div>
            <div className="text-[10px] md:text-xs text-dim font-mono">
              Total: {dailyLog.calories_consumed} cal
            </div>
          </div>
          <div className="space-y-2 md:space-y-3">
            {dailyLog.meals.map((meal) => (
              <div key={meal.id} className="border border-border rounded-sm p-3 md:p-4 hover:border-acid/50 transition-all bg-panel/50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-text text-xs md:text-sm font-mono uppercase mb-1 truncate">
                      {meal.meal_type ? meal.meal_type.replace(/_/g, ' ') : 'Meal'}
                    </div>
                    {meal.time && (
                      <div className="flex items-center gap-1 text-[10px] md:text-xs text-dim font-mono mb-2">
                        <span>{format(new Date(`${meal.date}T${meal.time}`), 'h:mm a')}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-bold text-acid font-mono text-base md:text-lg">{meal.calories}</div>
                    <div className="text-[10px] md:text-xs text-dim font-mono">cal</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3 pt-2 md:pt-3 border-t border-border">
                  <div>
                    <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-0.5 md:mb-1">Protein</div>
                    <div className="text-xs md:text-sm font-bold text-emerald-500 dark:text-text font-mono">{meal.protein}g</div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-0.5 md:mb-1">Carbs</div>
                    <div className="text-xs md:text-sm font-bold text-text font-mono">
                      {formatOptionalNutrition(meal.carbs)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-0.5 md:mb-1">Fats</div>
                    <div className="text-xs md:text-sm font-bold text-text font-mono">
                      {formatOptionalNutrition(meal.fats)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workouts */}
      {dailyLog.exercises.length > 0 && (
        <div className="card-modern p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-acid" />
              <h2 className="text-sm font-bold text-text uppercase tracking-widest font-mono">Workouts ({dailyLog.exercises.length})</h2>
            </div>
            <div className="text-xs text-dim font-mono">
              Total: {dailyLog.calories_burned} cal burned
            </div>
          </div>
          <div className="space-y-3">
            {dailyLog.exercises.map((exercise) => (
              <div key={exercise.id} className="border border-border rounded-sm p-4 hover:border-acid/50 transition-all bg-panel/50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-bold text-text text-sm font-mono uppercase mb-1">
                      {exercise.exercises[0]?.name || 'Workout'}
                    </div>
                    {exercise.time && (
                      <div className="flex items-center gap-1 text-xs text-dim font-mono mb-2">
                        <span>{format(new Date(`${exercise.date}T${exercise.time}`), 'h:mm a')}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-bold text-acid font-mono text-base md:text-lg">{exercise.calories_burned}</div>
                    <div className="text-[10px] md:text-xs text-dim font-mono">cal</div>
                  </div>
                </div>
                {exercise.duration && (
                  <div className="pt-2 md:pt-3 border-t border-border">
                    <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Duration</div>
                    <div className="text-xs md:text-sm font-bold text-text font-mono">{exercise.duration} min</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {dailyLog.meals.length === 0 && dailyLog.exercises.length === 0 && (
        <div className="card-modern text-center border-dashed py-8 md:py-12 px-4">
          <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-dim/50 mx-auto mb-3 md:mb-4" />
          <p className="text-dim font-mono text-xs md:text-sm mb-2">No activity logged for this date</p>
          <p className="text-[10px] md:text-xs text-dim font-mono">Start logging meals and workouts to see your summary</p>
        </div>
      )}
    </div>
  )
}
