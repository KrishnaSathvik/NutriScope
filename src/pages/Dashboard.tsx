import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { getDailyLog } from '@/services/dailyLogs'
import { getWaterIntake } from '@/services/water'
import { generateQuickTip } from '@/services/aiInsights'
import { QuickWeightEntry } from '@/components/QuickWeightEntry'
import { StreakWidget } from '@/components/StreakWidget'
import { Droplet, Flame, Plus, Activity, Beef, Sparkles, Loader2 } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

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
  const currentHour = new Date().getHours()
  const tipIndex = Math.floor(currentHour / 8) % 3 // Rotate every 8 hours: 0-7hrs = tip 0, 8-15hrs = tip 1, 16-23hrs = tip 2

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


      {/* Net Calories - Detailed */}
      {dailyLog && (
        <div className="card-modern p-4 md:p-6">
          <h2 className="text-sm md:text-base font-semibold text-text uppercase tracking-wider font-mono mb-4 md:mb-6">Calorie Balance</h2>
          
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            {/* Calories Consumed */}
            <div className="border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-6">
              <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider mb-1 md:mb-2">Consumed</div>
              <div className="text-3xl md:text-4xl font-bold text-text font-mono mb-1">
                {dailyLog.calories_consumed}
              </div>
              <div className="text-xs md:text-sm text-dim font-medium font-mono">
                from {dailyLog.meals.length} meal{dailyLog.meals.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Calories Burned */}
            <div className="border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-6">
              <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider mb-1 md:mb-2">Burned</div>
              <div className="text-3xl md:text-4xl font-bold text-text font-mono mb-1">
                {dailyLog.calories_burned}
              </div>
              <div className="text-xs md:text-sm text-dim font-medium font-mono">
                from {dailyLog.exercises.length} workout{dailyLog.exercises.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Net Calories */}
            <div className="pt-3 md:pt-0">
              <div className="text-xs md:text-sm text-dim font-medium font-mono uppercase tracking-wider mb-1 md:mb-2">Net</div>
              <div className={`text-3xl md:text-4xl font-bold font-mono mb-1 ${
                dailyLog.net_calories > 0 
                  ? 'text-success' 
                  : dailyLog.net_calories < 0 
                  ? 'text-error' 
                  : 'text-text'
              }`}>
                {dailyLog.net_calories > 0 ? '+' : ''}
                {dailyLog.net_calories}
              </div>
              <div className="text-xs md:text-sm text-dim font-medium font-mono">
                {dailyLog.net_calories > 0 
                  ? 'Surplus' 
                  : dailyLog.net_calories < 0 
                  ? 'Deficit' 
                  : 'Balanced'}
              </div>
            </div>
          </div>

          {/* Visual Breakdown */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs md:text-sm font-medium font-mono mb-2">
              <span className="text-text">Balance Breakdown</span>
              <span className="text-dim">
                Target: {profile?.calorie_target || 2000} cal
              </span>
            </div>
            <div className="relative w-full bg-border h-2 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-orange-500 dark:bg-orange-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(Math.max((dailyLog.calories_consumed / (profile?.calorie_target || 2000)) * 100, 0), 100)}%` }}
              />
              {dailyLog.calories_burned > 0 && (
                <div
                  className="absolute top-0 h-full bg-purple-500/70 dark:bg-error/50 transition-all duration-1000 ease-out"
                  style={{ 
                    left: `${Math.min(Math.max((dailyLog.calories_consumed / (profile?.calorie_target || 2000)) * 100, 0), 100)}%`,
                    width: `${Math.min((dailyLog.calories_burned / (profile?.calorie_target || 2000)) * 100, 100)}%`
                  }}
                />
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs md:text-sm font-medium font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 dark:bg-orange-500 rounded-full"></div>
                <span className="text-text">Consumed</span>
              </div>
              {dailyLog.calories_burned > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500/70 dark:bg-error/50 rounded-full"></div>
                  <span className="text-text">Burned</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
  )
}
