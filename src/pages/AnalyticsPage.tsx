import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, subMonths, differenceInDays } from 'date-fns'
import { getDailyLog } from '@/services/dailyLogs'
import { useAuth } from '@/contexts/AuthContext'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Line, AreaChart, Area, ComposedChart, Legend, ReferenceLine, BarChart, Bar } from 'recharts'
import { Flame, Target, Activity, Droplet, TrendingUp, TrendingDown, Minus, Cookie, Calendar, BarChart3, Scale, TrendingUp as TrendingUpIcon, Lightbulb, Beef, Wine, Moon } from 'lucide-react'
import { StatCardSkeleton, ChartSkeleton } from '@/components/LoadingSkeleton'
import { WeightChart } from '@/components/WeightChart'
import { getGoalAchievementInsightsFromData, getWeeklyPatternsFromData, predictWeight, getAlcoholWeightImpact, calculateAlcoholWeightImpact, getSleepWeightImpact, calculateSleepWeightImpact } from '@/services/analytics'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { formatSleepDurationShort } from '@/utils/format'

type TimeRange = '7d' | '30d' | '3m' | '1y' | 'custom'

export default function AnalyticsPage() {
  const { profile, user } = useAuth()

  // Set up realtime subscriptions for analytics data
  useUserRealtimeSubscription('meals', ['analytics', 'dailyLog'], user?.id)
  useUserRealtimeSubscription('exercises', ['analytics', 'dailyLog'], user?.id)
  useUserRealtimeSubscription('daily_logs', ['analytics', 'dailyLog'], user?.id)
  useUserRealtimeSubscription('weight_logs', ['weightLogs', 'correlations', 'predictions'], user?.id)
  useUserRealtimeSubscription('sleep_logs', ['analytics', 'dailyLog', 'sleepImpact'], user?.id)
  useUserRealtimeSubscription('alcohol_logs', ['analytics', 'dailyLog', 'alcoholImpact'], user?.id)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  
  const today = new Date()
  
  const getDateRange = () => {
    switch (timeRange) {
      case '7d':
        return Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i))
      case '30d':
        return Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i))
      case '3m':
        const threeMonthsAgo = subMonths(today, 3)
        const daysDiff = differenceInDays(today, threeMonthsAgo)
        return Array.from({ length: Math.min(daysDiff, 90) }, (_, i) => subDays(today, daysDiff - 1 - i))
      case '1y':
        // Sample monthly data points for year view
        return Array.from({ length: 12 }, (_, i) => subMonths(today, 11 - i))
      case 'custom':
        if (!customStart || !customEnd) return []
        const start = new Date(customStart)
        const end = new Date(customEnd)
        const customDaysDiff = differenceInDays(end, start)
        return Array.from({ length: Math.min(customDaysDiff + 1, 365) }, (_, i) => subDays(end, customDaysDiff - i))
      default:
        return Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i))
    }
  }

  const dateRange = getDateRange()
  const isYearView = timeRange === '1y'
  
  // Create stable date range string for query key
  const dateRangeString = dateRange.map((d) => format(d, 'yyyy-MM-dd')).join(',')

  type AnalyticsDataPoint = {
    date: string
    fullDate: string
    calories: number
    caloriesBurned: number
    netCalories: number
    protein: number
    carbs: number
    fats: number
    workouts: number
    water: number
    alcohol: number // standard drinks
    sleep: number | null // sleep hours
    meals: number
  }

  // Optimize: Batch load logs in chunks for large date ranges
  const { data: dailyLogs, isLoading } = useQuery<AnalyticsDataPoint[]>({
    queryKey: ['analytics', timeRange, customStart, customEnd, dateRangeString],
    queryFn: async (): Promise<AnalyticsDataPoint[]> => {
      // For large date ranges, load in batches to avoid overwhelming the API
      const batchSize = timeRange === '1y' ? 30 : timeRange === '3m' ? 30 : 50
      const dateStrings = dateRange.map((d) => format(d, 'yyyy-MM-dd'))
      
      // Load in batches sequentially to avoid overwhelming the API
      const batches: string[][] = []
      for (let i = 0; i < dateStrings.length; i += batchSize) {
        batches.push(dateStrings.slice(i, i + batchSize))
      }
      
      // Process batches sequentially for better performance and memory management
      const allLogs = []
      for (const batch of batches) {
        const batchLogs = await Promise.all(
          batch.map((date) => getDailyLog(date))
        )
        allLogs.push(...batchLogs)
      }
      
      const logs = allLogs
      
      // For year view, aggregate by month
      if (isYearView) {
        const monthlyData: { [key: string]: any } = {}
        logs.forEach((log, i) => {
          const monthKey = format(dateRange[i], 'MMM yyyy')
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              date: monthKey,
              calories: 0,
              caloriesBurned: 0,
              netCalories: 0,
              protein: 0,
              carbs: 0,
              fats: 0,
              workouts: 0,
              water: 0,
              alcohol: 0,
              sleep: null,
              meals: 0,
              count: 0,
            }
          }
          monthlyData[monthKey].calories += log.calories_consumed
          monthlyData[monthKey].caloriesBurned += log.calories_burned
          monthlyData[monthKey].netCalories += log.net_calories
          monthlyData[monthKey].protein += log.protein
          monthlyData[monthKey].carbs += (log.carbs || 0)
          monthlyData[monthKey].fats += (log.fats || 0)
          monthlyData[monthKey].workouts += log.exercises.length
          monthlyData[monthKey].water += log.water_intake
          monthlyData[monthKey].alcohol += (log.alcohol_drinks || 0)
          monthlyData[monthKey].sleep = monthlyData[monthKey].sleep === null ? (log.sleep_hours || null) : (monthlyData[monthKey].sleep || 0) + (log.sleep_hours || 0)
          monthlyData[monthKey].meals += log.meals.length
          monthlyData[monthKey].count += 1
        })
        
        return Object.values(monthlyData).map((data) => ({
          date: data.date,
          fullDate: '',
          calories: Math.round(data.calories / data.count),
          caloriesBurned: Math.round(data.caloriesBurned / data.count),
          netCalories: Math.round(data.netCalories / data.count),
          protein: Math.round(data.protein / data.count),
          carbs: Math.round(data.carbs / data.count),
          fats: Math.round(data.fats / data.count),
          water: Math.round(data.water / data.count),
          alcohol: Math.round((data.alcohol / data.count) * 100) / 100, // Round to 2 decimals
          sleep: data.sleep !== null ? Math.round((data.sleep / data.count) * 100) / 100 : null,
          workouts: data.workouts,
          meals: data.meals,
        }))
      }
      
      return logs.map((log, i) => ({
        date: isYearView ? format(dateRange[i], 'MMM yyyy') : format(dateRange[i], timeRange === '30d' ? 'MMM d' : 'MMM d'),
        fullDate: format(dateRange[i], 'yyyy-MM-dd'),
        calories: log.calories_consumed,
        caloriesBurned: log.calories_burned,
        netCalories: log.net_calories,
        protein: log.protein,
        carbs: log.carbs || 0,
        fats: log.fats || 0,
        workouts: log.exercises.length,
        water: log.water_intake,
        alcohol: log.alcohol_drinks || 0,
        sleep: log.sleep_hours || null,
        meals: log.meals.length,
      }))
    },
    enabled: Boolean(dateRange.length > 0 && (timeRange !== 'custom' || (customStart && customEnd))),
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    refetchOnMount: true, // Refetch when component mounts to ensure fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus (too expensive)
    refetchOnReconnect: true, // Refetch on reconnect
    retry: 1,
  })

  // Calculate statistics
  const logsArray: AnalyticsDataPoint[] = dailyLogs || []
  // Filter out days with no actual logged data (meals or exercises)
  const daysWithData = logsArray.filter(log => log.meals > 0 || log.workouts > 0 || log.water > 0 || log.calories > 0 || log.alcohol > 0 || (log.sleep !== null && log.sleep > 0))
  const stats = daysWithData.length > 0 ? {
    avgCalories: Math.round(daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.calories, 0) / daysWithData.length),
    avgProtein: Math.round(daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.protein, 0) / daysWithData.length),
    avgWater: Math.round(daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.water, 0) / daysWithData.length),
    avgAlcohol: Math.round((daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.alcohol, 0) / daysWithData.length) * 100) / 100,
    totalAlcohol: Math.round((daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.alcohol, 0)) * 100) / 100,
    avgSleep: daysWithData.filter(d => d.sleep !== null && d.sleep > 0).length > 0
      ? Math.round((daysWithData.filter(d => d.sleep !== null && d.sleep > 0).reduce((sum: number, d: AnalyticsDataPoint) => sum + (d.sleep || 0), 0) / daysWithData.filter(d => d.sleep !== null && d.sleep > 0).length) * 100) / 100
      : null,
    totalWorkouts: daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.workouts, 0),
    totalCaloriesBurned: daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.caloriesBurned, 0),
    avgNetCalories: Math.round(daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.netCalories, 0) / daysWithData.length),
    caloriesTrend: daysWithData.length >= 2 
      ? daysWithData[daysWithData.length - 1].calories - daysWithData[daysWithData.length - 2].calories
      : 0,
    proteinTrend: daysWithData.length >= 2
      ? daysWithData[daysWithData.length - 1].protein - daysWithData[daysWithData.length - 2].protein
      : 0,
  } : null

  const calorieTarget = profile?.calorie_target || 2000
  const proteinTarget = profile?.protein_target || 150
  const waterGoal = profile?.water_goal || 2000

  // Calculate insights directly from cached dailyLogs data (instant, no API calls)
  const goalAchievements = useMemo(() => {
    if (!dailyLogs || dailyLogs.length === 0) return null
    return getGoalAchievementInsightsFromData(
      dailyLogs.map(log => ({
        calories: log.calories,
        protein: log.protein,
        water: log.water,
        fullDate: log.fullDate,
      })),
      calorieTarget,
      proteinTarget,
      waterGoal
    )
  }, [dailyLogs, calorieTarget, proteinTarget, waterGoal])

  const weeklyPatterns = useMemo(() => {
    if (!dailyLogs || dailyLogs.length === 0) return null
    return getWeeklyPatternsFromData(
      dailyLogs.map(log => ({
        calories: log.calories,
        protein: log.protein,
        workouts: log.workouts,
        fullDate: log.fullDate,
      }))
    )
  }, [dailyLogs])

  const { data: weightPrediction } = useQuery({
    queryKey: ['predictions', 'weight', profile?.weight],
    queryFn: () => predictWeight(profile?.weight || 0, 30),
    enabled: !!user && !!profile?.weight && logsArray.length >= 2,
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    refetchOnMount: true, // Refetch when component mounts to ensure fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus (too expensive)
    refetchOnReconnect: true, // Refetch on reconnect
    retry: 1,
  })

  // Alcohol impact analysis
  const { data: alcoholImpact } = useQuery({
    queryKey: ['alcoholImpact', timeRange, user?.id, profile?.goal, profile?.calorie_target],
    queryFn: () => getAlcoholWeightImpact(
      timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '3m' ? 90 : 365,
      profile ? { goal: profile.goal, calorie_target: profile.calorie_target || profile.target_calories } : undefined
    ),
    enabled: !!(user && stats && stats.totalAlcohol > 0 && logsArray.length >= 7),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Sleep impact analysis
  const { data: sleepImpact } = useQuery({
    queryKey: ['sleepImpact', timeRange, user?.id, profile?.goal],
    queryFn: () => getSleepWeightImpact(
      timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '3m' ? 90 : 365,
      profile ? { goal: profile.goal, calorie_target: profile.calorie_target || profile.target_calories } : undefined
    ),
    enabled: !!(user && stats && stats.avgSleep !== null && stats.avgSleep > 0 && logsArray.length >= 7),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Get today's daily log for immediate alcohol impact calculation
  const todayDateString = format(new Date(), 'yyyy-MM-dd')
  const { data: todayDailyLog } = useQuery({
    queryKey: ['dailyLog', todayDateString],
    queryFn: () => getDailyLog(todayDateString),
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: true,
  })

  // Calculate today's alcohol impact immediately from today's log
  const todayAlcoholImpact = useMemo(() => {
    if (!profile || !todayDailyLog) return null
    const alcoholDrinks = todayDailyLog.alcohol_drinks || 0
    if (alcoholDrinks === 0) return null
    
    return calculateAlcoholWeightImpact(
      alcoholDrinks,
      calorieTarget,
      todayDailyLog.calories_consumed || 0,
      profile.goal || 'maintain'
    )
  }, [todayDailyLog, profile, calorieTarget])

  // Calculate today's sleep impact immediately from today's log
  const todaySleepImpact = useMemo(() => {
    if (!profile || !todayDailyLog || !todayDailyLog.sleep_hours) return null

    return calculateSleepWeightImpact(
      todayDailyLog.sleep_hours,
      profile.goal || 'maintain'
    )
  }, [todayDailyLog, profile])

  return (
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      <div className="border-b border-border pb-4 md:pb-6">
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="h-px w-6 md:w-8 bg-acid"></div>
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">Data Visualization</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">Analytics</h1>
              <div className="flex items-center gap-2 mt-3 md:mt-4">
                <BarChart3 className="w-4 h-4 text-acid flex-shrink-0" />
                <p className="text-[11px] md:text-xs text-dim/70 font-mono">
                  Analytics will appear once you have at least 2 days of logged data
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setTimeRange('7d')
                  setShowCustomPicker(false)
                }}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-all ${
                  timeRange === '7d'
                    ? 'bg-acid/20 text-acid border-acid/50'
                    : 'bg-surface text-dim border-border hover:border-acid/30'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => {
                  setTimeRange('30d')
                  setShowCustomPicker(false)
                }}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-all ${
                  timeRange === '30d'
                    ? 'bg-acid/20 text-acid border-acid/50'
                    : 'bg-surface text-dim border-border hover:border-acid/30'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => {
                  setTimeRange('3m')
                  setShowCustomPicker(false)
                }}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-all ${
                  timeRange === '3m'
                    ? 'bg-acid/20 text-acid border-acid/50'
                    : 'bg-surface text-dim border-border hover:border-acid/30'
                }`}
              >
                3 Months
              </button>
              <button
                onClick={() => {
                  setTimeRange('1y')
                  setShowCustomPicker(false)
                }}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-all ${
                  timeRange === '1y'
                    ? 'bg-acid/20 text-acid border-acid/50'
                    : 'bg-surface text-dim border-border hover:border-acid/30'
                }`}
              >
                1 Year
              </button>
              <button
                onClick={() => {
                  setTimeRange('custom')
                  setShowCustomPicker(!showCustomPicker)
                }}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-all flex items-center gap-1.5 ${
                  timeRange === 'custom'
                    ? 'bg-acid/20 text-acid border-acid/50'
                    : 'bg-surface text-dim border-border hover:border-acid/30'
                }`}
              >
                <Calendar className="w-3 h-3" />
                Custom
              </button>
            </div>
          </div>
          {showCustomPicker && timeRange === 'custom' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 p-4 bg-surface border border-border rounded-sm">
              <div className="flex-1">
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={format(today, 'yyyy-MM-dd')}
                  className="input-modern text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  max={format(today, 'yyyy-MM-dd')}
                  className="input-modern text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : daysWithData.length >= 2 && stats ? (
        <div className="space-y-4 md:space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="card-modern border-orange-500/30 dark:border-acid/30 p-3 md:p-4">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500 flex-shrink-0" />
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Avg Calories</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-orange-500 dark:text-acid font-mono mb-1">{stats.avgCalories}</div>
              <div className="flex items-center gap-1 text-[10px] md:text-xs font-mono">
                {stats.caloriesTrend > 0 ? (
                  <>
                    <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-success flex-shrink-0" />
                    <span className="text-success">+{stats.caloriesTrend}</span>
                  </>
                ) : stats.caloriesTrend < 0 ? (
                  <>
                    <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 text-error flex-shrink-0" />
                    <span className="text-error">{stats.caloriesTrend}</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-2.5 h-2.5 md:w-3 md:h-3 text-dim flex-shrink-0" />
                    <span className="text-dim">No change</span>
                  </>
                )}
                <span className="text-dim ml-1 hidden sm:inline">vs yesterday</span>
              </div>
            </div>

            <div className="card-modern border-success/30 p-3 md:p-4">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-success fill-success dark:text-success dark:fill-success flex-shrink-0" />
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Avg Protein</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-success font-mono mb-1">{stats.avgProtein}g</div>
              <div className="flex items-center gap-1 text-[10px] md:text-xs font-mono">
                {stats.proteinTrend > 0 ? (
                  <>
                    <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-success flex-shrink-0" />
                    <span className="text-success">+{stats.proteinTrend}g</span>
                  </>
                ) : stats.proteinTrend < 0 ? (
                  <>
                    <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 text-error flex-shrink-0" />
                    <span className="text-error">{stats.proteinTrend}g</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-2.5 h-2.5 md:w-3 md:h-3 text-dim flex-shrink-0" />
                    <span className="text-dim">No change</span>
                  </>
                )}
                <span className="text-dim ml-1 hidden sm:inline">vs yesterday</span>
              </div>
            </div>

            <div className="card-modern border-purple-500/30 dark:border-acid/30 p-3 md:p-4">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500 flex-shrink-0" />
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Total Workouts</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-purple-500 dark:text-text font-mono mb-1">{stats.totalWorkouts}</div>
              <div className="text-[10px] md:text-xs text-dim font-mono">
                {stats.totalCaloriesBurned} cal burned
              </div>
            </div>

            <div className="card-modern border-blue-500/30 dark:border-acid/30 p-3 md:p-4">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                <Droplet className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500 flex-shrink-0" />
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Avg Water</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-blue-500 dark:text-text font-mono mb-1">{stats.avgWater}ml</div>
              <div className="text-[10px] md:text-xs text-dim font-mono">
                {Math.round((stats.avgWater / waterGoal) * 100)}% of goal
              </div>
            </div>

            {stats.totalAlcohol > 0 && (
              <div className="card-modern border-amber-500/30 dark:border-amber-500/30 p-3 md:p-4">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                  <Wine className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500 flex-shrink-0" />
                  <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Avg Alcohol</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-amber-500 dark:text-text font-mono mb-1">{stats.avgAlcohol.toFixed(1)}</div>
                <div className="text-[10px] md:text-xs text-dim font-mono">
                  {stats.totalAlcohol.toFixed(1)} total drinks
                </div>
              </div>
            )}

            {stats.avgSleep !== null && stats.avgSleep > 0 && (
              <div className="card-modern border-indigo-500/30 dark:border-indigo-500/30 p-3 md:p-4">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                  <Moon className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500 flex-shrink-0" />
                  <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Avg Sleep</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-indigo-500 dark:text-text font-mono mb-1">{formatSleepDurationShort(stats.avgSleep)}</div>
                <div className="text-[10px] md:text-xs text-dim font-mono">
                  {stats.avgSleep >= 7 && stats.avgSleep <= 9 ? 'Optimal range' : stats.avgSleep < 7 ? 'Below recommended' : 'Above recommended'}
                </div>
              </div>
            )}
          </div>

          {/* Calories Balance Chart */}
          <div className="card-modern border-acid/30 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-orange-500/20 dark:bg-acid/20 flex items-center justify-center border border-orange-500/30 dark:border-acid/30 flex-shrink-0">
                  <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500" />
                </div>
                <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                  Calorie Balance {timeRange === '7d' ? '(Last 7 Days)' : timeRange === '30d' ? '(Last 30 Days)' : timeRange === '3m' ? '(Last 3 Months)' : timeRange === '1y' ? '(Last Year)' : '(Custom Range)'}
                </h2>
              </div>
              <div className="text-[10px] md:text-xs text-dim font-mono">
                Target: {calorieTarget} cal
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240} className="md:h-[350px]">
              <ComposedChart data={logsArray}>
                <defs>
                  <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-acid)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-acid)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="burnedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff3300" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff3300" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#525252" 
                  tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222' }}
                />
                <YAxis 
                  stroke="#525252" 
                  tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111',
                    border: '1px solid #222',
                    borderRadius: '4px',
                    color: '#e5e5e5',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  fill="url(#caloriesGradient)" 
                  stroke="var(--color-acid)" 
                  strokeWidth={2}
                  name="Consumed"
                />
                <Area 
                  type="monotone" 
                  dataKey="caloriesBurned" 
                  fill="url(#burnedGradient)" 
                  stroke="#ff3300" 
                  strokeWidth={2}
                  name="Burned"
                />
                <Line 
                  type="monotone" 
                  dataKey="netCalories" 
                  stroke="#00cc66" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#00cc66', r: 3 }}
                  name="Net"
                />
                <ReferenceLine 
                  y={calorieTarget} 
                  stroke="#525252" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  label={{ value: "Target", position: "right", fill: "#525252", fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <Legend 
                  wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#525252' }}
                  iconType="line"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Protein Chart */}
          <div className="card-modern border-success/30 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-success/20 flex items-center justify-center border border-success/30 flex-shrink-0">
                  <Beef className="w-4 h-4 md:w-5 md:h-5 text-success fill-success dark:text-success dark:fill-success" />
                </div>
                <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                  Protein Intake {timeRange === '7d' ? '(Last 7 Days)' : timeRange === '30d' ? '(Last 30 Days)' : timeRange === '3m' ? '(Last 3 Months)' : timeRange === '1y' ? '(Last Year)' : '(Custom Range)'}
                </h2>
              </div>
              <div className="text-[10px] md:text-xs text-dim font-mono">
                Target: {proteinTarget}g
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240} className="md:h-[350px]">
              <BarChart data={logsArray}>
                <defs>
                  <linearGradient id="proteinBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00cc66" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#00cc66" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#525252" 
                  tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222' }}
                />
                <YAxis 
                  stroke="#525252" 
                  tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111',
                    border: '1px solid #222',
                    borderRadius: '4px',
                    color: '#e5e5e5',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <Bar 
                  dataKey="protein" 
                  fill="url(#proteinBarGradient)" 
                  radius={[4, 4, 0, 0]}
                  name="Protein (g)"
                />
                <ReferenceLine 
                  y={proteinTarget} 
                  stroke="#525252" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  label={{ value: "Target", position: "right", fill: "#525252", fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Macros Breakdown */}
          <div className="card-modern p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-yellow-500/20 dark:bg-acid/20 flex items-center justify-center border border-yellow-500/30 dark:border-acid/30 flex-shrink-0">
                <Cookie className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500 dark:text-yellow-500 dark:fill-yellow-500" />
              </div>
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Macronutrients Breakdown</h2>
            </div>
            <ResponsiveContainer width="100%" height={220} className="md:h-[300px]">
              <AreaChart data={logsArray}>
                <defs>
                  <linearGradient id="proteinGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="carbsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-acid)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-acid)" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="fatsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ffaa00" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#525252" 
                  tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222' }}
                />
                <YAxis 
                  stroke="#525252" 
                  tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111',
                    border: '1px solid #222',
                    borderRadius: '4px',
                    color: '#e5e5e5',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="protein" 
                  stackId="macros"
                  fill="url(#proteinGradient)" 
                  stroke="var(--color-success)" 
                  strokeWidth={2}
                  name="Protein" 
                />
                <Area 
                  type="monotone" 
                  dataKey="carbs" 
                  stackId="macros"
                  fill="url(#carbsGradient)" 
                  stroke="var(--color-acid)" 
                  strokeWidth={2}
                  name="Carbs" 
                />
                <Area 
                  type="monotone" 
                  dataKey="fats" 
                  stackId="macros"
                  fill="url(#fatsGradient)" 
                  stroke="#ffaa00" 
                  strokeWidth={2}
                  name="Fats" 
                />
                <Legend 
                  wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#525252' }}
                  iconType="square"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Water & Activity Combined */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Water Chart */}
            <div className="card-modern border-blue-500/30 dark:border-acid/30 p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-blue-500/20 dark:bg-acid/20 flex items-center justify-center border border-blue-500/30 dark:border-acid/30 flex-shrink-0">
                  <Droplet className="w-4 h-4 md:w-5 md:h-5 text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500" />
                </div>
                <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Water Intake</h2>
              </div>
              <ResponsiveContainer width="100%" height={180} className="md:h-[250px]">
                <BarChart data={logsArray}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                  />
                  <YAxis 
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid #222',
                      borderRadius: '4px',
                      color: '#e5e5e5',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                    }}
                  />
                  <Bar 
                    dataKey="water" 
                    fill="var(--color-acid)" 
                    radius={[4, 4, 0, 0]}
                    name="Water (ml)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Workouts Chart */}
            <div className="card-modern border-purple-500/30 dark:border-acid/30 p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-purple-500/20 dark:bg-acid/20 flex items-center justify-center border border-purple-500/30 dark:border-acid/30 flex-shrink-0">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500" />
                </div>
                <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Workouts</h2>
              </div>
              <ResponsiveContainer width="100%" height={180} className="md:h-[250px]">
                <ComposedChart data={logsArray}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                    label={{ value: 'Workouts', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#ff3300" 
                    tick={{ fill: '#ff3300', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#ff3300' }}
                    label={{ value: 'Calories', angle: 90, position: 'insideRight', fill: '#ff3300', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid #222',
                      borderRadius: '4px',
                      color: '#e5e5e5',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Calories Burned') {
                        return [`${value.toFixed(0)} cal`, name]
                      }
                      return [value, name]
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#525252' }}
                    iconType="rect"
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="workouts" 
                    fill="#ffaa00" 
                    radius={[4, 4, 0, 0]}
                    name="Workouts"
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="caloriesBurned" 
                    fill="#ff3300" 
                    radius={[4, 4, 0, 0]}
                    name="Calories Burned"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alcohol Chart */}
          {stats && stats.totalAlcohol > 0 && (
            <div className="card-modern border-amber-500/30 dark:border-amber-500/30 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-amber-500/20 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30 dark:border-amber-500/30 flex-shrink-0">
                    <Wine className="w-4 h-4 md:w-5 md:h-5 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500" />
                  </div>
                  <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Alcohol Consumption</h2>
                </div>
                <div className="text-[10px] md:text-xs text-dim font-mono">
                  Avg: {stats.avgAlcohol.toFixed(1)} drinks/day • Total: {stats.totalAlcohol.toFixed(1)} drinks
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240} className="md:h-[350px]">
                <BarChart data={logsArray}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                  />
                  <YAxis 
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid #222',
                      borderRadius: '4px',
                      color: '#e5e5e5',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} drinks`, 'Alcohol']}
                  />
                  <Bar 
                    dataKey="alcohol" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                    name="Alcohol (drinks)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sleep Chart */}
          {stats && stats.avgSleep !== null && (
            <div className="card-modern border-indigo-500/30 dark:border-indigo-500/30 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
                    <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
                  </div>
                  <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Sleep Duration</h2>
                </div>
                <div className="text-[10px] md:text-xs text-dim font-mono">
                  Avg: {stats.avgSleep !== null && stats.avgSleep !== undefined ? formatSleepDurationShort(stats.avgSleep) : '-'}/day
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240} className="md:h-[350px]">
                <BarChart data={logsArray.filter(d => d.sleep !== null && d.sleep > 0)}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                  />
                  <YAxis 
                    stroke="#525252" 
                    tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#222' }}
                    domain={[0, 12]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid #222',
                      borderRadius: '4px',
                      color: '#e5e5e5',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [formatSleepDurationShort(value), 'Sleep']}
                  />
                  <Bar 
                    dataKey="sleep" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]}
                    name="Sleep (hours)"
                  />
                  <ReferenceLine 
                    y={7} 
                    stroke="#525252" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{ value: "Min", position: "right", fill: "#525252", fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  />
                  <ReferenceLine 
                    y={9} 
                    stroke="#525252" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{ value: "Max", position: "right", fill: "#525252", fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Unified Insights & Patterns Section */}
          {(goalAchievements || weeklyPatterns || todaySleepImpact || (stats && stats.avgSleep !== null && stats.avgSleep > 0 && sleepImpact) || todayAlcoholImpact || (stats && stats.totalAlcohol > 0 && alcoholImpact)) && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-acid" />
                Insights & Patterns
              </h2>

              {/* Sleep Impact Analysis */}
              {(todaySleepImpact || (stats && stats.avgSleep !== null && stats.avgSleep > 0 && sleepImpact)) && (
                <div className="card-modern border-indigo-500/30 dark:border-indigo-500/30 p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
                      <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                      Sleep Impact on Weight Goals
                    </h3>
                  </div>

                  {/* Today's Impact */}
                  {todaySleepImpact && (
                    <div className="mb-4 md:mb-6 p-3 md:p-4 bg-surface border border-border rounded-sm">
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">Today's Impact</div>
                      <div className="text-sm md:text-base text-text font-mono mb-2">
                        {todaySleepImpact.impactOnGoal}
                      </div>
                      <div className="text-xs md:text-sm text-dim font-mono mb-2">
                        {todaySleepImpact.recommendation}
                      </div>
                      {todaySleepImpact.projectedImpact && (
                        <div className="text-xs md:text-sm text-indigo-500 font-mono font-bold">
                          {todaySleepImpact.projectedImpact}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Historical Correlation */}
                  {sleepImpact && sleepImpact.data && sleepImpact.data.length > 0 && (
                    <div className="space-y-3 md:space-y-4">
                      <div className="p-3 md:p-4 bg-surface border border-border rounded-sm">
                        <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">
                          Correlation Analysis ({timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '3m' ? '3 months' : '1 year'})
                        </div>
                        <div className="text-sm md:text-base text-text font-mono mb-2">
                          {sleepImpact.insight}
                        </div>
                        <div className="text-xs md:text-sm text-dim font-mono">
                          {sleepImpact.dataPointsCount !== undefined && sleepImpact.dataPointsCount < 5 ? (
                            <>
                              <span className="text-dim">Limited data: Only {sleepImpact.dataPointsCount} day{sleepImpact.dataPointsCount !== 1 ? 's' : ''} with sleep logged</span>
                              <span className="text-dim ml-2">(Need 5+ days for reliable correlation)</span>
                            </>
                          ) : (
                            <>
                              Correlation: {(sleepImpact.correlation * 100).toFixed(1)}%
                              {sleepImpact.correlation < -0.3 && (
                                <span className="text-success ml-2">✓ Better sleep associated with weight loss</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {sleepImpact.impactPrediction && (
                        <div className="p-3 md:p-4 bg-acid/10 border border-acid/30 rounded-sm">
                          <div className="text-[10px] md:text-xs text-acid font-mono uppercase mb-2">
                            Personalized Prediction
                          </div>
                          <div className="text-xs md:text-sm text-text font-mono">
                            {sleepImpact.impactPrediction}
                          </div>
                          {sleepImpact.averageSleepHours > 0 && (
                            <div className="text-xs text-dim font-mono mt-2">
                              Average sleep: {formatSleepDurationShort(sleepImpact.averageSleepHours)}/day
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Alcohol Impact Analysis */}
              {(todayAlcoholImpact || (stats && stats.totalAlcohol > 0 && alcoholImpact)) && (
                <div className="card-modern border-amber-500/30 dark:border-amber-500/30 p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-amber-500/20 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30 dark:border-amber-500/30 flex-shrink-0">
                      <Wine className="w-4 h-4 md:w-5 md:h-5 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500" />
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                      Alcohol Impact on Weight Goals
                    </h3>
                  </div>

                  {/* Today's Impact */}
                  {todayAlcoholImpact && (
                    <div className="mb-4 md:mb-6 p-3 md:p-4 bg-surface border border-border rounded-sm">
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">Today's Impact</div>
                      <div className="text-sm md:text-base text-text font-mono mb-2">
                        {todayAlcoholImpact.impactOnGoal}
                      </div>
                      <div className="text-xs md:text-sm text-dim font-mono mb-2">
                        {todayAlcoholImpact.recommendation}
                      </div>
                      {todayAlcoholImpact.projectedWeeklyImpact && (
                        <div className="text-xs md:text-sm text-amber-500 font-mono font-bold">
                          {todayAlcoholImpact.projectedWeeklyImpact}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Historical Correlation */}
                  {alcoholImpact && alcoholImpact.data && alcoholImpact.data.length > 0 && (
                    <div className="space-y-3 md:space-y-4">
                      <div className="p-3 md:p-4 bg-surface border border-border rounded-sm">
                        <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">
                          Correlation Analysis ({timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '3m' ? '3 months' : '1 year'})
                        </div>
                        <div className="text-sm md:text-base text-text font-mono mb-2">
                          {alcoholImpact.insight}
                        </div>
                        <div className="text-xs md:text-sm text-dim font-mono">
                          {alcoholImpact.dataPointsCount !== undefined && alcoholImpact.dataPointsCount < 5 ? (
                            <>
                              <span className="text-dim">Limited data: Only {alcoholImpact.dataPointsCount} day{alcoholImpact.dataPointsCount !== 1 ? 's' : ''} with alcohol consumption</span>
                              <span className="text-dim ml-2">(Need 5+ days for reliable correlation)</span>
                            </>
                          ) : (
                            <>
                              Correlation: {(alcoholImpact.correlation * 100).toFixed(1)}%
                              {alcoholImpact.correlation > 0.3 && (
                                <span className="text-warning ml-2">⚠️ May be affecting weight loss</span>
                              )}
                              {alcoholImpact.correlation < -0.3 && (
                                <span className="text-dim ml-2">(More alcohol → Less weight)</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {alcoholImpact.impactPrediction && (
                        <div className="p-3 md:p-4 bg-acid/10 border border-acid/30 rounded-sm">
                          <div className="text-[10px] md:text-xs text-acid font-mono uppercase mb-2">
                            Personalized Prediction
                          </div>
                          <div className="text-xs md:text-sm text-text font-mono">
                            {alcoholImpact.impactPrediction}
                          </div>
                          {alcoholImpact.averageAlcoholOnWeightGainDays > 0 && (
                            <div className="text-xs text-dim font-mono mt-2">
                              Avg alcohol on weight gain days: {alcoholImpact.averageAlcoholOnWeightGainDays.toFixed(1)} drinks
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Goal Achievement */}
              {goalAchievements && goalAchievements.totalDays > 0 && (
                <div className="card-modern border-acid/30 p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-4">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                    <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                      Goal Achievement Rate
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">Calories</div>
                      <div className="text-2xl md:text-3xl font-bold text-text font-mono mb-1">
                        {goalAchievements.calorieAchievementRate}%
                      </div>
                      <div className="text-[10px] text-dim font-mono">
                        {goalAchievements.calorieGoalDays} of {goalAchievements.totalDays} days
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">Protein</div>
                      <div className="text-2xl md:text-3xl font-bold text-success font-mono mb-1">
                        {goalAchievements.proteinAchievementRate}%
                      </div>
                      <div className="text-[10px] text-dim font-mono">
                        {goalAchievements.proteinGoalDays} of {goalAchievements.totalDays} days
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">Water</div>
                      <div className="text-2xl md:text-3xl font-bold text-sky-400 font-mono mb-1">
                        {goalAchievements.waterAchievementRate}%
                      </div>
                      <div className="text-[10px] text-dim font-mono">
                        {goalAchievements.waterGoalDays} of {goalAchievements.totalDays} days
                      </div>
                    </div>
                  </div>
                  {goalAchievements.insights.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border/50">
                      {goalAchievements.insights.map((insight, idx) => (
                        <div key={idx} className="text-xs md:text-sm text-text font-mono flex items-start gap-2">
                          <span className="text-acid mt-0.5">•</span>
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Weekly Patterns */}
              {weeklyPatterns && weeklyPatterns.bestDay && (
                <div className="card-modern border-acid/30 p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-4">
                    <TrendingUpIcon className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                    <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                      Weekly Patterns
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">Best Day</div>
                      <div className="text-sm font-mono text-text mb-1">
                        {format(new Date(weeklyPatterns.bestDay.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-dim font-mono">
                        {weeklyPatterns.bestDay.calories} cal • {weeklyPatterns.bestDay.protein}g protein
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-2">Workout Frequency</div>
                      <div className="text-lg font-bold text-acid font-mono mb-1">
                        {weeklyPatterns.averageWorkoutsPerWeek} per week
                      </div>
                      <div className="text-xs text-dim font-mono">
                        {weeklyPatterns.workoutDays} workout days • {weeklyPatterns.restDays} rest days
                      </div>
                    </div>
                  </div>
                  {weeklyPatterns.insights.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border/50">
                      {weeklyPatterns.insights.map((insight, idx) => (
                        <div key={idx} className="text-xs md:text-sm text-text font-mono flex items-start gap-2">
                          <span className="text-acid mt-0.5">•</span>
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Weight Trends */}
          <div className="card-modern border-acid/30 p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
                <Scale className="w-4 h-4 md:w-5 md:h-5 text-acid" />
              </div>
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Weight Trends</h2>
            </div>

            <WeightChart days={30} showBMI={true} showGoal={true} showDailyChange={true} weightPrediction={weightPrediction || undefined} />
          </div>
        </div>
      ) : (
        <div className="card-modern text-center border-dashed py-12 md:py-16 px-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-acid/10 border border-acid/20 flex items-center justify-center mx-auto mb-4 md:mb-6 animate-pulse">
            <Activity className="w-8 h-8 md:w-10 md:h-10 text-acid/60" />
          </div>
          <h3 className="text-text font-mono font-bold text-base md:text-lg mb-2">Not enough data for analytics yet</h3>
          <p className="text-dim font-mono text-xs md:text-sm mb-6 md:mb-8 max-w-md mx-auto">
            Start logging meals and workouts to see your insights!
          </p>
        </div>
      )}
      </div>
  )
}
