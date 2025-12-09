import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays, subMonths, differenceInDays } from 'date-fns'
import { getDailyLog } from '@/services/dailyLogs'
import { useAuth } from '@/contexts/AuthContext'
import PullToRefresh from '@/components/PullToRefresh'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, AreaChart, Area, ComposedChart, Legend, ScatterChart, Scatter, Cell } from 'recharts'
import { Flame, Target, Activity, Droplet, TrendingUp, TrendingDown, Minus, Cookie, Calendar, BarChart3, Scale, TrendingUp as TrendingUpIcon, Lightbulb, Beef } from 'lucide-react'
import { StatCardSkeleton, ChartSkeleton } from '@/components/LoadingSkeleton'
import { WeightChart } from '@/components/WeightChart'
import { getWeightCaloriesCorrelation, getProteinWorkoutsCorrelation, predictWeight } from '@/services/analytics'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

type TimeRange = '7d' | '30d' | '3m' | '1y' | 'custom'

export default function AnalyticsPage() {
  const { profile, user } = useAuth()
  const queryClient = useQueryClient()

  // Set up realtime subscriptions for analytics data
  useUserRealtimeSubscription('meals', ['analytics', 'dailyLog'], user?.id)
  useUserRealtimeSubscription('exercises', ['analytics', 'dailyLog'], user?.id)
  useUserRealtimeSubscription('daily_logs', ['analytics', 'dailyLog'], user?.id)
  useUserRealtimeSubscription('weight_logs', ['weightLogs', 'correlations', 'predictions'], user?.id)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  
  const today = new Date()

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['weightLogs'] }),
      queryClient.invalidateQueries({ queryKey: ['correlations'] }),
      queryClient.invalidateQueries({ queryKey: ['predictions'] }),
    ])
  }
  
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
    meals: number
  }

  // Optimize: Batch load logs in chunks for large date ranges
  const { data: dailyLogs, isLoading } = useQuery<AnalyticsDataPoint[]>({
    queryKey: ['analytics', timeRange, customStart, customEnd, dateRange.map((d) => format(d, 'yyyy-MM-dd'))],
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
        meals: log.meals.length,
      }))
    },
    enabled: Boolean(dateRange.length > 0 && (timeRange !== 'custom' || (customStart && customEnd))),
    initialData: [] as AnalyticsDataPoint[],
  })

  // Calculate statistics
  const logsArray: AnalyticsDataPoint[] = dailyLogs || []
  // Filter out days with no actual logged data (meals or exercises)
  const daysWithData = logsArray.filter(log => log.meals > 0 || log.workouts > 0 || log.water > 0 || log.calories > 0)
  const stats = daysWithData.length > 0 ? {
    avgCalories: Math.round(daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.calories, 0) / daysWithData.length),
    avgProtein: Math.round(daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.protein, 0) / daysWithData.length),
    avgWater: Math.round(daysWithData.reduce((sum: number, d: AnalyticsDataPoint) => sum + d.water, 0) / daysWithData.length),
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

  // Advanced Analytics Queries (after logsArray is defined)
  const { data: weightCaloriesCorrelation } = useQuery({
    queryKey: ['correlations', 'weight-calories', timeRange],
    queryFn: () => getWeightCaloriesCorrelation(timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90),
    enabled: !!user && daysWithData.length >= 2,
  })

  const { data: proteinWorkoutsCorrelation } = useQuery({
    queryKey: ['correlations', 'protein-workouts', timeRange],
    queryFn: () => getProteinWorkoutsCorrelation(timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90),
    enabled: !!user && daysWithData.length >= 2,
  })

  const { data: weightPrediction } = useQuery({
    queryKey: ['predictions', 'weight', profile?.weight],
    queryFn: () => predictWeight(profile?.weight || 0, 30),
    enabled: !!user && !!profile?.weight && logsArray.length >= 2,
  })

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={!user}>
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
                <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-success fill-success/80 dark:text-success dark:fill-success/80 stroke-success stroke-1 flex-shrink-0" />
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
            <ResponsiveContainer width="100%" height={280} className="md:h-[350px]">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
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
                  <Beef className="w-4 h-4 md:w-5 md:h-5 text-success fill-success/80 dark:text-success dark:fill-success/80 stroke-success stroke-1" />
                </div>
                <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                  Protein Intake {timeRange === '7d' ? '(Last 7 Days)' : timeRange === '30d' ? '(Last 30 Days)' : timeRange === '3m' ? '(Last 3 Months)' : timeRange === '1y' ? '(Last Year)' : '(Custom Range)'}
                </h2>
              </div>
              <div className="text-[10px] md:text-xs text-dim font-mono">
                Target: {proteinTarget}g
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280} className="md:h-[350px]">
              <AreaChart data={logsArray}>
                <defs>
                  <linearGradient id="proteinGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00cc66" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00cc66" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
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
                  fill="url(#proteinGradient)" 
                  stroke="#00cc66" 
                  strokeWidth={3}
                />
                <Line 
                  type="monotone" 
                  dataKey={proteinTarget} 
                  stroke="#525252" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Target"
                />
              </AreaChart>
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
            <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
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
              <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                <LineChart data={logsArray}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
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
                  <Line 
                    type="monotone" 
                    dataKey="water" 
                    stroke="var(--color-acid)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-acid)', r: 3 }}
                    name="Water (ml)"
                  />
                </LineChart>
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
              <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                <LineChart data={logsArray}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
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
                  <Line 
                    type="monotone" 
                    dataKey="workouts" 
                    stroke="#ffaa00" 
                    strokeWidth={2}
                    dot={{ fill: '#ffaa00', r: 3 }}
                    name="Workouts"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Advanced Analytics - Correlations & Insights */}
          {(weightCaloriesCorrelation || proteinWorkoutsCorrelation || weightPrediction) && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-acid" />
                Advanced Insights
              </h2>

              {/* Weight Prediction */}
              {weightPrediction && (
                <div className="card-modern border-acid/30 p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-4">
                    <TrendingUpIcon className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                    <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                      Weight Prediction
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-1">Current Weight</div>
                      <div className="text-xl md:text-2xl font-bold text-text font-mono">
                        {weightPrediction.currentValue.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-1">Predicted (7 days)</div>
                      <div className={`text-xl md:text-2xl font-bold font-mono ${
                        weightPrediction.trend === 'decreasing' ? 'text-success' : 
                        weightPrediction.trend === 'increasing' ? 'text-error' : 'text-text'
                      }`}>
                        {weightPrediction.predictedValue.toFixed(1)} kg
                      </div>
                    </div>
                    {weightPrediction.daysToGoal && (
                      <div>
                        <div className="text-[10px] md:text-xs text-dim font-mono uppercase mb-1">Days to Goal</div>
                        <div className="text-xl md:text-2xl font-bold text-acid font-mono">
                          ~{weightPrediction.daysToGoal} days
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Correlations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Weight vs Calories Correlation */}
                {weightCaloriesCorrelation && weightCaloriesCorrelation.data.length > 0 && (
                  <div className="card-modern border-acid/30 p-4 md:p-6">
                    <div className="flex items-center gap-2 md:gap-3 mb-4">
                      <Scale className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                      <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                        Weight vs Calories
                      </h3>
                    </div>
                    <div className="mb-4">
                      <div className="text-xs font-mono text-dim mb-2">
                        Correlation: <span className={`font-bold ${
                          Math.abs(weightCaloriesCorrelation.correlation) > 0.5 ? 'text-acid' : 
                          Math.abs(weightCaloriesCorrelation.correlation) > 0.2 ? 'text-success' : 'text-dim'
                        }`}>
                          {weightCaloriesCorrelation.correlation.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] md:text-xs text-dim font-mono italic">
                        {weightCaloriesCorrelation.insight}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ScatterChart data={weightCaloriesCorrelation.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis 
                          dataKey="x" 
                          name="Calories"
                          stroke="#525252"
                          tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        />
                        <YAxis 
                          dataKey="y" 
                          name="Weight (kg)"
                          stroke="#525252"
                          tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
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
                        <Scatter name="Weight vs Calories" dataKey="y" fill="#ffaa00">
                          {weightCaloriesCorrelation.data.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill="#ffaa00" />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Protein vs Workouts Correlation */}
                {proteinWorkoutsCorrelation && proteinWorkoutsCorrelation.data.length > 0 && (
                  <div className="card-modern border-acid/30 p-4 md:p-6">
                    <div className="flex items-center gap-2 md:gap-3 mb-4">
                      <Target className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                      <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                        Protein vs Workouts
                      </h3>
                    </div>
                    <div className="mb-4">
                      <div className="text-xs font-mono text-dim mb-2">
                        Correlation: <span className={`font-bold ${
                          Math.abs(proteinWorkoutsCorrelation.correlation) > 0.5 ? 'text-acid' : 
                          Math.abs(proteinWorkoutsCorrelation.correlation) > 0.2 ? 'text-success' : 'text-dim'
                        }`}>
                          {proteinWorkoutsCorrelation.correlation.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] md:text-xs text-dim font-mono italic">
                        {proteinWorkoutsCorrelation.insight}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ScatterChart data={proteinWorkoutsCorrelation.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis 
                          dataKey="x" 
                          name="Protein (g)"
                          stroke="#525252"
                          tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        />
                        <YAxis 
                          dataKey="y" 
                          name="Workouts"
                          stroke="#525252"
                          tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
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
                        <Scatter name="Protein vs Workouts" dataKey="y" fill="#00ff88">
                          {proteinWorkoutsCorrelation.data.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill="#00ff88" />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
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
            <WeightChart days={30} showBMI={true} showGoal={true} showDailyChange={true} />
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
    </PullToRefresh>
  )
}
