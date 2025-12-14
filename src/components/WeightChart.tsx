import { useQuery } from '@tanstack/react-query'
import { format, subDays, subMonths } from 'date-fns'
import { getWeightLogs, calculateBMI, getBMICategoryInfo } from '@/services/weightTracking'
import { useAuth } from '@/contexts/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts'
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface WeightChartProps {
  days?: number
  showBMI?: boolean
  showGoal?: boolean
  showDailyChange?: boolean
  weightPrediction?: {
    currentValue: number
    predictedValue: number
    daysToGoal: number | null
    trend: 'increasing' | 'decreasing' | 'stable'
  } | null
}

export function WeightChart({ days = 30, showBMI = false, showGoal = false, showDailyChange = true, weightPrediction = null }: WeightChartProps) {
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

        {weightPrediction && (
          <div className="card-modern border-acid/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <TrendingUp className={`w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 ${
                weightPrediction.trend === 'decreasing' ? 'text-success' : 
                weightPrediction.trend === 'increasing' ? 'text-error' : 'text-dim'
              }`} />
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Predicted (7d)</span>
            </div>
            <div className={`text-xl md:text-2xl font-bold font-mono ${
              weightPrediction.trend === 'decreasing' ? 'text-success' : 
              weightPrediction.trend === 'increasing' ? 'text-error' : 'text-text'
            }`}>
              {weightPrediction.predictedValue.toFixed(1)}kg
            </div>
            {weightPrediction.trend !== 'stable' && (
              <div className="text-[10px] md:text-xs text-dim font-mono mt-1">
                {weightPrediction.trend === 'decreasing' ? '↓ Decreasing' : '↑ Increasing'}
              </div>
            )}
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
          <ComposedChart data={chartData}>
            <XAxis
              dataKey="date"
              stroke="#525252"
              tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#222' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="weight"
              stroke="#525252"
              tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#222' }}
              domain={['dataMin - 2', 'dataMax + 2']}
              label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            {showBMI && chartData.some(d => d.bmi !== null) && (
              <YAxis
                yAxisId="bmi"
                orientation="right"
                stroke="#525252"
                tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#222' }}
                domain={[15, 35]}
                label={{ value: 'BMI', angle: 90, position: 'insideRight', fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#111',
                border: '1px solid #222',
                borderRadius: '4px',
                color: '#e5e5e5',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
              }}
              formatter={(value: number, name: string, props: any) => {
                if (name === 'Weight') {
                  const change = props.payload.change
                  const changeText = change !== null 
                    ? ` (${change > 0 ? '+' : ''}${change.toFixed(1)}kg)`
                    : ''
                  return [`${value.toFixed(1)}kg${changeText}`, 'Weight']
                } else if (name === 'BMI') {
                  const bmiValue = value || props.payload.bmi
                  const bmiCategory = bmiValue ? getBMICategoryInfo(bmiValue).label : ''
                  return [`${bmiValue.toFixed(1)} ${bmiCategory ? `(${bmiCategory})` : ''}`, 'BMI']
                }
                return [value, name]
              }}
            />
            {showGoal && targetWeight && (
              <ReferenceLine
                yAxisId="weight"
                y={targetWeight}
                stroke="#525252"
                strokeWidth={1}
                strokeDasharray="5 5"
                label={{ value: 'Goal', position: 'right', fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              />
            )}
            {showBMI && (
              <>
                {/* BMI category reference lines */}
                <ReferenceLine
                  yAxisId="bmi"
                  y={18.5}
                  stroke="#525252"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                  strokeOpacity={0.3}
                />
                <ReferenceLine
                  yAxisId="bmi"
                  y={25}
                  stroke="#525252"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                  strokeOpacity={0.3}
                />
                <ReferenceLine
                  yAxisId="bmi"
                  y={30}
                  stroke="#525252"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                  strokeOpacity={0.3}
                />
              </>
            )}
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="weight"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-success)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Weight"
            />
            {showBMI && (
              <Line
                yAxisId="bmi"
                type="monotone"
                dataKey="bmi"
                stroke="var(--color-acid)"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ fill: 'var(--color-acid)', r: 3 }}
                activeDot={{ r: 5 }}
                name="BMI"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

