import { useQuery } from '@tanstack/react-query'
import { format, subDays, subMonths } from 'date-fns'
import { getWeightLogs, calculateBMI, getBMICategoryInfo } from '@/services/weightTracking'
import { useAuth } from '@/contexts/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface WeightChartProps {
  days?: number
  showBMI?: boolean
  showGoal?: boolean
  showDailyChange?: boolean
}

export function WeightChart({ days = 30, showBMI = false, showGoal = false, showDailyChange = true }: WeightChartProps) {
  const { profile } = useAuth()
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const { data: weightLogs, isLoading } = useQuery({
    queryKey: ['weightLogs', startDate, endDate],
    queryFn: () => getWeightLogs(startDate, endDate),
  })

  if (isLoading) {
    return (
      <div className="text-center py-8 text-dim font-mono text-xs md:text-sm">
        Loading weight data...
      </div>
    )
  }

  if (!weightLogs || weightLogs.length === 0) {
    return (
      <div className="text-center py-8 text-dim font-mono text-xs md:text-sm">
        No weight data available. Start logging your weight to see trends!
      </div>
    )
  }

  // Prepare chart data with daily changes
  const sortedLogs = weightLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const chartData = sortedLogs.map((log, index) => {
    const bmi = profile?.height ? calculateBMI(log.weight, profile.height) : null
    const previousWeight = index > 0 ? sortedLogs[index - 1].weight : null
    const dailyChange = previousWeight ? log.weight - previousWeight : null

    return {
      date: format(new Date(log.date), 'MMM d'),
      fullDate: log.date,
      weight: Math.round(log.weight * 10) / 10,
      bmi: bmi ? Math.round(bmi * 10) / 10 : null,
      bodyFat: log.body_fat_percentage ? Math.round(log.body_fat_percentage * 10) / 10 : null,
      muscleMass: log.muscle_mass ? Math.round(log.muscle_mass * 10) / 10 : null,
      change: dailyChange ? Math.round(dailyChange * 10) / 10 : null,
    }
  })

  const latestWeight = chartData[chartData.length - 1]?.weight
  const previousWeight = chartData.length > 1 ? chartData[0]?.weight : null
  const weightChange = previousWeight && latestWeight ? latestWeight - previousWeight : null

  // Calculate goal weight (if user has weight goal)
  // For now, we'll use a simple calculation based on BMI target
  const targetWeight = profile?.height && profile?.goal === 'lose_weight'
    ? Math.round((profile.height / 100) ** 2 * 22 * 10) / 10 // Target BMI of 22
    : null

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="card-modern border-acid/30 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
            <Scale className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Current</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-acid font-mono">
            {latestWeight?.toFixed(1)}kg
          </div>
        </div>

        {weightChange !== null && (
          <div className="card-modern border-success/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              {weightChange > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-error flex-shrink-0" />
              ) : weightChange < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-success flex-shrink-0" />
              ) : (
                <Minus className="w-3.5 h-3.5 md:w-4 md:h-4 text-dim flex-shrink-0" />
              )}
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Change</span>
            </div>
            <div className={`text-xl md:text-2xl font-bold font-mono ${
              weightChange > 0 ? 'text-error' : weightChange < 0 ? 'text-success' : 'text-dim'
            }`}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}kg
            </div>
            <div className="text-[10px] md:text-xs text-dim font-mono mt-1">
              over {days} days
            </div>
          </div>
        )}

        {showBMI && chartData[chartData.length - 1]?.bmi && (
          <div className="card-modern border-success/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Scale className="w-3.5 h-3.5 md:w-4 md:h-4 text-success flex-shrink-0" />
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">BMI</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-success font-mono">
              {chartData[chartData.length - 1].bmi}
            </div>
            <div className="text-[10px] md:text-xs text-dim font-mono mt-1">
              {getBMICategoryInfo(chartData[chartData.length - 1].bmi!).label}
            </div>
          </div>
        )}

        {targetWeight && (
          <div className="card-modern p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Scale className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Target</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-text font-mono">
              {targetWeight.toFixed(1)}kg
            </div>
            {latestWeight && (
              <div className="text-[10px] md:text-xs text-dim font-mono mt-1">
                {Math.abs(latestWeight - targetWeight).toFixed(1)}kg to go
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="card-modern p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
            Weight Trend ({days} days)
          </h3>
          {showDailyChange && chartData.length > 1 && (
            <div className="text-[10px] md:text-xs text-dim font-mono">
              {chartData.filter(d => d.change !== null).length} entries
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              stroke="#888"
              style={{ fontSize: '10px', fontFamily: 'monospace' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#888"
              style={{ fontSize: '10px', fontFamily: 'monospace' }}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string, props: any) => {
                const change = props.payload.change
                const changeText = change !== null 
                  ? ` (${change > 0 ? '+' : ''}${change.toFixed(1)}kg)`
                  : ''
                return [`${value.toFixed(1)}kg${changeText}`, 'Weight']
              }}
            />
            {showGoal && targetWeight && (
              <ReferenceLine
                y={targetWeight}
                stroke="#22c55e"
                strokeDasharray="5 5"
                label={{ value: 'Goal', position: 'right', fill: '#22c55e' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

