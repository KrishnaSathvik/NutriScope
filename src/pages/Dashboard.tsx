import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { getDailyLog } from '@/services/dailyLogs'
import { getWaterIntake } from '@/services/water'
import { generateQuickTip } from '@/services/aiInsights'
import { QuickWeightEntry } from '@/components/QuickWeightEntry'
import { StreakWidget } from '@/components/StreakWidget'
import { Droplet, Flame, Plus, Activity, Beef, Sparkles, Loader2, Info } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { calculatePersonalizedTargets } from '@/services/personalizedTargets'
import type { UserGoals } from '@/types'

export default function Dashboard() {
  const [showWaterForm, setShowWaterForm] = useState(false)
  const { user, profile } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const queryClient = useQueryClient()

  // Set up realtime subscriptions for automatic updates
  useUserRealtimeSubscription('meals', ['meals', 'dailyLog', 'aiInsights'], user?.id)
  useUserRealtimeSubscription('exercises', ['exercises', 'dailyLog', 'aiInsights'], user?.id)
  useUserRealtimeSubscription('daily_logs', ['dailyLog', 'waterIntake'], user?.id)
  useUserRealtimeSubscription('weight_logs', ['weightLogs', 'latestWeight'], user?.id)

  const { data: dailyLog } = useQuery({
    queryKey: ['dailyLog', today],
    queryFn: () => getDailyLog(today),
    enabled: !!user,
  })

  // Generate inspirational coach tips for Dashboard (rotates 2-3 per day)
  // Use date + hour to rotate tips throughout the day
  // Memoize tipIndex to prevent unnecessary recalculations
  const tipIndex = useMemo(() => {
  const currentHour = new Date().getHours()
    return Math.floor(currentHour / 8) % 3 // Rotate every 8 hours: 0-7hrs = tip 0, 8-15hrs = tip 1, 16-23hrs = tip 2
  }, [today]) // Recalculate only when date changes

  const { data: aiInsight, isLoading: isLoadingInsight } = useQuery({
    queryKey: ['quickTip', 'dashboard', today, tipIndex],
    queryFn: async () => {
      if (!dailyLog || !user?.id) return null
      
      // Phase 3: Try to get from DB first
      const { getAICache, saveAICache, deleteAICache } = await import('@/services/aiCache')
      const cachedTip = await getAICache(user.id, 'coach_tip', today, tipIndex)
      
      // Don't use cached error messages - regenerate if cached tip is an error
      const errorMessages = [
        'AI tips are temporarily unavailable',
        'Unable to generate tip',
        'AI tips are not available',
      ]
      const isError = cachedTip && errorMessages.some(msg => cachedTip.includes(msg))
      
      if (cachedTip && !isError) {
        return cachedTip
      }
      
      // If cached tip is an error, delete it and regenerate
      if (isError) {
        await deleteAICache(user.id, 'coach_tip', today, tipIndex)
      }
      
      // Only generate new tip if we don't have cached one or cached one was an error
      const tip = await generateQuickTip(dailyLog, profile, tipIndex, user.id)
      
      // Phase 3: Save to DB (but don't save error messages)
      if (tip && !errorMessages.some(msg => tip.includes(msg))) {
        await saveAICache(user.id, 'coach_tip', today, tip, tipIndex)
      }
      
      return tip
    },
    enabled: !!user && !!dailyLog && !!profile,
    staleTime: Infinity, // Never consider stale (we handle rotation via tipIndex)
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnReconnect: false, // Don't refetch on reconnect
  })

  const { data: totalWater } = useQuery({
    queryKey: ['waterIntake', today],
    queryFn: async () => {
      if (!user) return 0
      return getWaterIntake(user.id, today)
    },
    enabled: !!user,
  })

  const waterMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Not authenticated')
      const { addWaterIntake } = await import('@/services/water')
      return addWaterIntake(user.id, today, amount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterIntake'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      queryClient.invalidateQueries({ queryKey: ['streak'] }) // Update streak when water is logged
      setShowWaterForm(false)
    },
  })

  const handleWaterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get('amount'))
    waterMutation.mutate(amount)
  }

  const waterAmount = totalWater || 0
  const waterGoal = profile?.water_goal || 2000
  const quickWaterAmounts = [250, 500, 750, 1000]

  const caloriesProgress = Math.min(
    ((dailyLog?.calories_consumed || 0) / (profile?.calorie_target || 2000)) * 100,
    100
  )
  const proteinProgress = Math.min(
    ((dailyLog?.protein || 0) / (profile?.protein_target || 150)) * 100,
    100
  )

  return (
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-4 md:pb-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="h-[2px] w-6 md:w-8 bg-acid"></div>
            <div className="h-[2px] w-3 md:w-4 bg-acid/50"></div>
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest ml-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-text tracking-tight mt-2 md:mt-4">
            Dashboard
          </h1>
        </div>
      </div>

      {/* Streak Widget */}
      <StreakWidget />

      {/* Quick Weight Entry */}
      <QuickWeightEntry />

      {/* Coach Tip Card */}
      {aiInsight && (
        <div className="card-modern p-4 md:p-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 rounded-xl bg-icon-soft flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-acid fill-acid" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] md:text-xs text-acid font-bold font-mono uppercase tracking-wider">Coach Tip</span>
              </div>
              <p className="text-sm md:text-base text-text font-medium font-mono leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        </div>
      )}
      
      {isLoadingInsight && dailyLog && (
        <div className="card-modern p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 rounded-xl bg-icon-soft flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-acid animate-spin" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] md:text-xs text-acid font-bold font-mono uppercase tracking-wider mb-2">Coach Tip</div>
              <div className="text-sm text-dim font-mono">Generating personalized insight...</div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Calories Card */}
        <div className="card-modern p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-10 h-10 rounded-xl bg-icon-soft flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] md:text-xs text-dim font-medium font-mono uppercase tracking-wider mb-1 truncate">Calories</div>
              <div className="text-xl md:text-2xl font-bold text-text font-mono">
                {dailyLog?.calories_consumed || 0}
                <span className="text-xs md:text-sm text-dim font-medium ml-1">
                  / {profile?.calorie_target || 2000}
                </span>
              </div>
            </div>
          </div>
          <div className="relative w-full bg-border h-1 overflow-hidden rounded-full">
            <div
              className="absolute top-0 left-0 h-full bg-orange-500 dark:bg-orange-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(caloriesProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Protein Card */}
        <div className="card-modern p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-10 h-10 rounded-xl bg-icon-soft flex items-center justify-center flex-shrink-0">
              <Beef className="w-5 h-5 text-emerald-500 fill-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] md:text-xs text-dim font-medium font-mono uppercase tracking-wider mb-1 truncate">Protein</div>
              <div className="text-xl md:text-2xl font-bold text-text font-mono">
                {dailyLog?.protein || 0}g
                <span className="text-xs md:text-sm text-dim font-medium ml-1">
                  / {profile?.protein_target || 150}g
                </span>
              </div>
            </div>
          </div>
          <div className="relative w-full bg-border h-1 overflow-hidden rounded-full">
            <div
              className="absolute top-0 left-0 h-full bg-emerald-500 dark:bg-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(proteinProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Water Card */}
        <div className="card-modern p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-10 h-10 rounded-xl bg-icon-soft flex items-center justify-center flex-shrink-0">
              <Droplet className="w-5 h-5 text-blue-500 fill-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] md:text-xs text-dim font-medium font-mono uppercase tracking-wider mb-1 truncate">Water</div>
              <div className="text-xl md:text-2xl font-bold text-text font-mono">
                {waterAmount}ml
                <span className="text-xs md:text-sm text-dim font-medium ml-1">
                  / {waterGoal}ml
                </span>
              </div>
            </div>
          </div>
          <div className="relative w-full bg-border h-1 overflow-hidden rounded-full">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 dark:bg-blue-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min((waterAmount / waterGoal) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Activity Card */}
        <div className="card-modern p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-10 h-10 rounded-xl bg-icon-soft flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-purple-500 fill-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] md:text-xs text-dim font-medium font-mono uppercase tracking-wider mb-1 truncate">Activity</div>
              <div className="text-xl md:text-2xl font-bold text-text font-mono">
                {dailyLog?.calories_burned || 0}
                <span className="text-xs md:text-sm text-dim font-medium ml-1">cal</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] md:text-xs text-dim font-medium font-mono">
            {dailyLog?.exercises.length || 0} workout{dailyLog?.exercises.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Water Intake Section */}
      <div className="card-modern p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-12 h-12 rounded-xl bg-icon-soft flex items-center justify-center flex-shrink-0">
              <Droplet className="w-6 h-6 text-blue-500 fill-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm md:text-base font-semibold text-text uppercase tracking-wider font-mono mb-1">Water Intake</h2>
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium font-mono">
                <span className="text-dim">Today:</span>
                <span className="text-text font-bold text-lg md:text-xl">{waterAmount}ml</span>
                <span className="text-dim">/ {waterGoal}ml</span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider mb-1">Progress</div>
            <div className="text-lg md:text-xl font-bold text-text font-mono">{Math.round((waterAmount / waterGoal) * 100)}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full bg-border h-3 mb-6 overflow-hidden rounded-full">
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 dark:bg-blue-500 transition-all duration-1000 ease-out"
            style={{ width: `${Math.min((waterAmount / waterGoal) * 100, 100)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-mono text-text font-bold z-10">
              {waterAmount}ml
            </span>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider">Quick Add</div>
            {!showWaterForm && (
              <button
                onClick={() => setShowWaterForm(true)}
                className="text-[10px] md:text-xs text-acid font-bold hover:opacity-90 font-mono uppercase tracking-wider transition-colors flex items-center gap-1 py-1 px-2 -mr-2"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Custom</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quickWaterAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  waterMutation.mutate(amount)
                }}
                disabled={waterMutation.isPending}
                className="group relative overflow-hidden border border-border bg-surface hover:border-blue-500 dark:hover:border-acid transition-all duration-300 py-2.5 md:py-3 px-1 md:px-2 rounded-sm active:scale-95"
              >
                <div className="text-[10px] md:text-xs font-bold font-mono text-acid group-hover:text-acid dark:group-hover:text-acid transition-colors mb-1">
                  {amount}ml
                </div>
                <Droplet className="w-3 h-3 md:w-4 md:h-4 mx-auto text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:fill-blue-600 dark:group-hover:fill-blue-400 group-hover:scale-110 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount Form */}
        {showWaterForm && (
          <form onSubmit={handleWaterSubmit} className="border-t border-border pt-4">
            <div className="mb-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">Amount (ml)</label>
              <input
                type="number"
                name="amount"
                required
                min="1"
                className="input-modern"
                placeholder="e.g., 250"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="btn-primary"
                disabled={waterMutation.isPending}
              >
                {waterMutation.isPending ? 'Adding...' : 'Add Water'}
              </button>
              <button
                type="button"
                onClick={() => setShowWaterForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>


      {/* Calorie Balance - Clear Summary */}
      {dailyLog && (
        <div className="card-modern p-4 md:p-6">
          <h2 className="text-sm md:text-base font-semibold text-text uppercase tracking-wider font-mono mb-4 md:mb-6">Calorie Balance</h2>
          
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            {/* Total Calories Consumed */}
            <div className="border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-6">
              <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider mb-1 md:mb-2">Total Calories</div>
              <div className="text-3xl md:text-4xl font-bold text-text font-mono mb-1">
                {dailyLog.calories_consumed}
              </div>
              <div className="text-xs md:text-sm text-dim font-medium font-mono">
                consumed today
              </div>
            </div>

            {/* Total Calories Burned */}
            <div className="border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-6">
              <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider mb-1 md:mb-2">Total Burned</div>
              <div className="text-3xl md:text-4xl font-bold text-text font-mono mb-1">
                {dailyLog.calories_burned}
              </div>
              <div className="text-xs md:text-sm text-dim font-medium font-mono">
                burned today
              </div>
            </div>

            {/* Calorie Deficit/Surplus - Personalized by Goal */}
            {(() => {
              // Calculate TDEE if we have required profile data
              const hasRequiredData = profile?.weight && profile?.height && profile?.age && (profile?.goal || (profile as any)?.goals) && profile?.activity_level && profile?.gender
              let tdee: number | null = null
              
              if (hasRequiredData) {
                // Use goals array if available, otherwise fall back to single goal
                const userGoals: UserGoals = (profile as any)?.goals && (profile as any).goals.length > 0
                  ? (profile as any).goals as UserGoals
                  : (profile?.goal ? [profile.goal] : ['maintain']) as UserGoals
                
                const targets = calculatePersonalizedTargets({
                  weight: profile.weight!,
                  height: profile.height!,
                  age: profile.age!,
                  goal: userGoals, // Pass array of goals
                  activityLevel: profile.activity_level!,
                  dietaryPreference: profile.dietary_preference,
                  isMale: profile.gender === 'male',
                })
                tdee = targets.tdee
              }
              
              // Standard nutrition calculation: Net Calories = Consumed - Burned
              const netCalories = dailyLog.calories_consumed - dailyLog.calories_burned
              
              // Calculate actual deficit/surplus vs TDEE (maintenance calories)
              // Deficit = TDEE - Net Calories (positive = deficit, negative = surplus)
              let actualDeficit: number | null = null
              let displayLabel = 'Deficit Total'
              let isGoodDeficit = false
              let isSurplus = false
              
              if (tdee !== null) {
                actualDeficit = tdee - netCalories
                
                // Personalize display based on goal
                if (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness') {
                  // For weight loss: positive deficit is good (eating less than maintenance)
                  isGoodDeficit = actualDeficit > 0
                  isSurplus = actualDeficit < 0
                  displayLabel = 'Calorie Deficit'
                } else if (profile?.goal === 'gain_muscle') {
                  // For muscle gain: negative deficit (surplus) is good (eating more than maintenance)
                  isGoodDeficit = actualDeficit < 0
                  isSurplus = actualDeficit < 0
                  displayLabel = 'Calorie Surplus'
                  actualDeficit = Math.abs(actualDeficit) // Show as positive surplus
                } else {
                  // For maintain: close to 0 is good
                  isGoodDeficit = Math.abs(actualDeficit) < 50
                  isSurplus = actualDeficit < 0
                  displayLabel = 'Balance'
                }
              } else {
                // Fallback: use target-based calculation if TDEE not available
                const calorieTarget = profile?.calorie_target || 2000
                actualDeficit = calorieTarget - netCalories
                isSurplus = actualDeficit < 0
                displayLabel = 'Deficit Total'
              }
              
              return (
                <div className="pt-3 md:pt-0">
                  <div className="flex items-center gap-1.5 mb-1 md:mb-2">
                    <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider">{displayLabel}</div>
                    {tdee !== null && (
                      <div className="group relative">
                        <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-dim cursor-help hover:text-accent transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-surface border border-border rounded-lg shadow-xl text-xs text-text z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
                          <div className="space-y-2 font-mono">
                            <div>
                              <strong className="text-accent">TDEE:</strong> {tdee} cal/day<br />
                              <span className="text-dim text-[10px]">What you burn daily (maintenance)</span>
                            </div>
                            <div>
                              <strong className="text-accent">Net Calories:</strong> {netCalories} cal<br />
                              <span className="text-dim text-[10px]">What you actually "kept" after exercise</span>
                            </div>
                            <div>
                              <strong className="text-accent">Deficit:</strong> {Math.abs(actualDeficit || 0)} cal<br />
                              <span className="text-dim text-[10px]">How much {actualDeficit && actualDeficit > 0 ? 'less' : 'more'} you're eating than maintenance</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`text-3xl md:text-4xl font-bold font-mono mb-1 ${
                    isSurplus && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness')
                      ? 'text-error' // Surplus is bad for weight loss
                      : isGoodDeficit
                      ? 'text-success' // Good deficit/surplus for goal
                      : isSurplus && profile?.goal === 'gain_muscle'
                      ? 'text-success' // Surplus is good for muscle gain
                      : 'text-error' // Deficit is bad for muscle gain
                  }`}>
                    {isSurplus && profile?.goal === 'gain_muscle' ? '+' : ''}
                    {Math.abs(actualDeficit || 0)}
                  </div>
                  <div className="text-xs md:text-sm text-dim font-medium font-mono">
                    {isSurplus && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness')
                      ? 'cal surplus'
                      : isSurplus && profile?.goal === 'gain_muscle'
                      ? 'cal surplus'
                      : actualDeficit === 0 || (actualDeficit !== null && Math.abs(actualDeficit) < 50)
                      ? 'balanced'
                      : 'cal deficit'}
                  </div>
                  {tdee !== null && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="text-[10px] md:text-xs text-dim font-mono space-y-0.5">
                        <div>Net: {netCalories} cal (consumed - burned)</div>
                        <div>TDEE: {tdee} cal (maintenance)</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Visual Breakdown - All 3 Metrics */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs md:text-sm font-medium font-mono mb-3">
              <span className="text-text">Balance Breakdown</span>
              <span className="text-dim">
                Target: {profile?.calorie_target || 2000} cal
              </span>
            </div>
            
            {/* Progress Bar Showing All 3 Metrics */}
            {(() => {
              // Calculate TDEE for accurate deficit calculation
              const hasRequiredData = profile?.weight && profile?.height && profile?.age && profile?.goal && profile?.activity_level && profile?.gender
              let tdee: number | null = null
              
              if (hasRequiredData) {
                const targets = calculatePersonalizedTargets({
                  weight: profile.weight!,
                  height: profile.height!,
                  age: profile.age!,
                  goal: profile.goal!,
                  activityLevel: profile.activity_level!,
                  dietaryPreference: profile.dietary_preference,
                  isMale: profile.gender === 'male',
                })
                tdee = targets.tdee
              }
              
              // Use TDEE for progress bar if available, otherwise use target
              const referenceCalories = tdee || profile?.calorie_target || 2000
              
              const consumedPercent = Math.min((dailyLog.calories_consumed / referenceCalories) * 100, 100)
              const burnedPercent = Math.min((dailyLog.calories_burned / referenceCalories) * 100, 100)
              
              // Standard nutrition: Net Calories = Consumed - Burned
              const netCalories = dailyLog.calories_consumed - dailyLog.calories_burned
              
              // Actual deficit vs TDEE (or target if TDEE not available)
              const actualDeficit = referenceCalories - netCalories
              const deficitPercent = Math.min((Math.abs(actualDeficit) / referenceCalories) * 100, 100)
              
              return (
                <>
                  <div className="relative w-full bg-border h-3 rounded-full overflow-hidden mb-3">
                    {/* Consumed (Orange) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-orange-500 dark:bg-orange-500 transition-all duration-1000 ease-out"
                      style={{ width: `${consumedPercent}%` }}
                      title={`Consumed: ${dailyLog.calories_consumed} cal`}
                    />
                    
                    {/* Burned (Purple) - starts after consumed */}
                    {dailyLog.calories_burned > 0 && (
                      <div
                        className="absolute top-0 h-full bg-purple-500 dark:bg-purple-500 transition-all duration-1000 ease-out"
                        style={{ 
                          left: `${consumedPercent}%`,
                          width: `${burnedPercent}%`
                        }}
                        title={`Burned: ${dailyLog.calories_burned} cal`}
                      />
                    )}
                    
                    {/* Deficit/Surplus Indicator (Green/Red) - Personalized by Goal */}
                    {actualDeficit !== 0 && (
                      <div
                        className={`absolute top-0 h-full border-2 border-dashed transition-all duration-1000 ease-out ${
                          (actualDeficit < 0 && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness'))
                            ? 'border-error bg-error/20' // Surplus is bad for weight loss
                            : (actualDeficit > 0 && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness'))
                            ? 'border-success bg-success/20' // Deficit is good for weight loss
                            : (actualDeficit < 0 && profile?.goal === 'gain_muscle')
                            ? 'border-success bg-success/20' // Surplus is good for muscle gain
                            : 'border-error bg-error/20' // Deficit is bad for muscle gain
                        }`}
                        style={{ 
                          left: `${consumedPercent + burnedPercent}%`,
                          width: `${Math.min(deficitPercent, 100 - consumedPercent - burnedPercent)}%`
                        }}
                        title={`${actualDeficit < 0 ? 'Surplus' : 'Deficit'}: ${Math.abs(actualDeficit)} cal`}
                      />
                    )}
                    
                    {/* Target Line Marker */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-text/50 dark:bg-text/30 transition-all duration-1000 ease-out"
                      style={{ left: '100%' }}
                    />
                  </div>
                  
                  {/* Legend - All 3 Metrics */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm font-medium font-mono">
                    {/* Consumed */}
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-orange-500 dark:bg-orange-500 rounded-full flex-shrink-0"></div>
                      <div className="flex flex-col">
                        <span className="text-text">Consumed</span>
                        <span className="text-dim text-[10px]">{dailyLog.calories_consumed} cal</span>
                      </div>
                    </div>
                    
                    {/* Burned */}
                    {dailyLog.calories_burned > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-purple-500 dark:bg-purple-500 rounded-full flex-shrink-0"></div>
                        <div className="flex flex-col">
                          <span className="text-text">Burned</span>
                          <span className="text-dim text-[10px]">{dailyLog.calories_burned} cal</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-border rounded-full flex-shrink-0"></div>
                        <div className="flex flex-col">
                          <span className="text-dim">Burned</span>
                          <span className="text-dim text-[10px]">0 cal</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Deficit/Surplus - Personalized by Goal */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border-2 border-dashed ${
                        (actualDeficit < 0 && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness'))
                          ? 'bg-error/20 border-error' // Surplus is bad for weight loss
                          : (actualDeficit > 0 && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness'))
                          ? 'bg-success/20 border-success' // Deficit is good for weight loss
                          : (actualDeficit < 0 && profile?.goal === 'gain_muscle')
                          ? 'bg-success/20 border-success' // Surplus is good for muscle gain
                          : actualDeficit === 0 || Math.abs(actualDeficit) < 50
                          ? 'bg-border border-border'
                          : 'bg-error/20 border-error' // Deficit is bad for muscle gain
                      }`}></div>
                      <div className="flex flex-col">
                        <span className={`${
                          (actualDeficit < 0 && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness'))
                            ? 'text-error' // Surplus is bad for weight loss
                            : (actualDeficit > 0 && (profile?.goal === 'lose_weight' || profile?.goal === 'improve_fitness'))
                            ? 'text-success' // Deficit is good for weight loss
                            : (actualDeficit < 0 && profile?.goal === 'gain_muscle')
                            ? 'text-success' // Surplus is good for muscle gain
                            : actualDeficit === 0 || Math.abs(actualDeficit) < 50
                            ? 'text-dim'
                            : 'text-error' // Deficit is bad for muscle gain
                        }`}>
                          {actualDeficit < 0 ? 'Surplus' : actualDeficit > 0 ? 'Deficit' : 'Balanced'}
                        </span>
                        <span className="text-dim text-[10px]">
                          {actualDeficit !== 0 ? `${Math.abs(actualDeficit)} cal` : 'On target'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      </div>
  )
}
