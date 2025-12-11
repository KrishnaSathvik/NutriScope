import { getDailyLog } from './dailyLogs'
import { getWeightLogs } from './weightTracking'
import { format, subDays } from 'date-fns'

export interface CorrelationData {
  x: number
  y: number
  date: string
}

export interface TrendLinePoint {
  x: number
  y: number
}

export interface PredictionData {
  currentValue: number
  predictedValue: number
  daysToGoal: number | null
  trend: 'increasing' | 'decreasing' | 'stable'
}

/**
 * Calculate correlation between two data series
 */
export function calculateCorrelation(
  data1: number[],
  data2: number[]
): number {
  if (data1.length !== data2.length || data1.length === 0) return 0

  const n = data1.length
  const sum1 = data1.reduce((a, b) => a + b, 0)
  const sum2 = data2.reduce((a, b) => a + b, 0)
  const sum1Sq = data1.reduce((a, b) => a + b * b, 0)
  const sum2Sq = data2.reduce((a, b) => a + b * b, 0)
  const pSum = data1.reduce((sum, val, i) => sum + val * data2[i], 0)

  const num = pSum - (sum1 * sum2 / n)
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n))

  if (den === 0) return 0
  return num / den
}

/**
 * Calculate trend line points for correlation visualization
 */
export function calculateTrendLine(data: CorrelationData[]): TrendLinePoint[] {
  if (data.length < 2) return []
  
  const n = data.length
  const sumX = data.reduce((sum, d) => sum + d.x, 0)
  const sumY = data.reduce((sum, d) => sum + d.y, 0)
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0)
  const sumXX = data.reduce((sum, d) => sum + d.x * d.x, 0)
  
  const meanX = sumX / n
  const meanY = sumY / n
  
  const denominator = sumXX - n * meanX * meanX
  if (Math.abs(denominator) < 0.0001) {
    // All x values are the same, return horizontal line
    return [
      { x: data[0].x, y: meanY },
      { x: data[data.length - 1].x, y: meanY }
    ]
  }
  
  const slope = (sumXY - n * meanX * meanY) / denominator
  const intercept = meanY - slope * meanX
  
  // Find min and max x values
  const xValues = data.map(d => d.x)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  
  // Generate trend line points
  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ]
}

/**
 * Get weight vs calories correlation data
 */
export async function getWeightCaloriesCorrelation(days: number = 30): Promise<{
  correlation: number
  data: CorrelationData[]
  insight: string
}> {
  const endDate = new Date()
  const startDate = subDays(endDate, days)
  
  const weightLogs = await getWeightLogs(
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  )

  const correlationData: CorrelationData[] = []
  const calories: number[] = []
  const weights: number[] = []

  for (let i = 0; i < days; i++) {
    const date = format(subDays(endDate, days - 1 - i), 'yyyy-MM-dd')
    const dailyLog = await getDailyLog(date)
    const weightLog = weightLogs.find(w => w.date === date)

    if (weightLog && dailyLog.calories_consumed > 0) {
      correlationData.push({
        x: dailyLog.calories_consumed,
        y: weightLog.weight,
        date,
      })
      calories.push(dailyLog.calories_consumed)
      weights.push(weightLog.weight)
    }
  }

  const correlation = calculateCorrelation(calories, weights)
  
  let insight = ''
  if (correlation > 0.5) {
    insight = 'Strong positive correlation: Higher calorie intake is associated with weight gain.'
  } else if (correlation < -0.5) {
    insight = 'Strong negative correlation: Higher calorie intake is associated with weight loss (deficit).'
  } else if (correlation > 0.2) {
    insight = 'Moderate positive correlation: Calorie intake may influence weight.'
  } else if (correlation < -0.2) {
    insight = 'Moderate negative correlation: Calorie intake may influence weight loss.'
  } else {
    insight = 'Weak correlation: Calorie intake and weight show little direct relationship.'
  }

  return { correlation, data: correlationData, insight }
}

/**
 * Get protein vs workouts correlation
 */
export async function getProteinWorkoutsCorrelation(days: number = 30): Promise<{
  correlation: number
  data: CorrelationData[]
  insight: string
}> {
  const endDate = new Date()
  const correlationData: CorrelationData[] = []
  const proteins: number[] = []
  const workoutCounts: number[] = []

  for (let i = 0; i < days; i++) {
    const date = format(subDays(endDate, days - 1 - i), 'yyyy-MM-dd')
    const dailyLog = await getDailyLog(date)

    if (dailyLog.protein > 0) {
      correlationData.push({
        x: dailyLog.protein,
        y: dailyLog.exercises.length,
        date,
      })
      proteins.push(dailyLog.protein)
      workoutCounts.push(dailyLog.exercises.length)
    }
  }

  const correlation = calculateCorrelation(proteins, workoutCounts)
  
  let insight = ''
  if (correlation > 0.5) {
    insight = 'Strong correlation: Higher protein days correlate with more workouts.'
  } else if (correlation > 0.2) {
    insight = 'Moderate correlation: Protein intake may influence workout frequency.'
  } else {
    insight = 'Weak correlation: Protein and workouts show little direct relationship.'
  }

  return { correlation, data: correlationData, insight }
}

/**
 * Predict future weight based on current trend
 */
export async function predictWeight(
  targetWeight: number,
  days: number = 30
): Promise<PredictionData> {
  const endDate = new Date()
  const startDate = subDays(endDate, days)
  
  const weightLogs = await getWeightLogs(
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  )

  if (weightLogs.length < 2) {
    return {
      currentValue: weightLogs[0]?.weight || 0,
      predictedValue: weightLogs[0]?.weight || 0,
      daysToGoal: null,
      trend: 'stable',
    }
  }

  // Calculate trend (linear regression)
  const sortedLogs = weightLogs.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  const n = sortedLogs.length
  const xValues = sortedLogs.map((_, i) => i)
  const yValues = sortedLogs.map(w => w.weight)

  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const currentWeight = sortedLogs[sortedLogs.length - 1].weight
  const predictedWeight = slope * (n + 7) + intercept // Predict 7 days ahead

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (slope > 0.01) trend = 'increasing'
  else if (slope < -0.01) trend = 'decreasing'

  // Calculate days to goal
  let daysToGoal: number | null = null
  if (targetWeight > 0) {
    if (trend === 'decreasing' && targetWeight < currentWeight) {
      const weightDiff = currentWeight - targetWeight
      const dailyChange = Math.abs(slope)
      if (dailyChange > 0) {
        daysToGoal = Math.ceil(weightDiff / dailyChange)
      }
    } else if (trend === 'increasing' && targetWeight > currentWeight) {
      const weightDiff = targetWeight - currentWeight
      const dailyChange = Math.abs(slope)
      if (dailyChange > 0) {
        daysToGoal = Math.ceil(weightDiff / dailyChange)
      }
    }
  }

  return {
    currentValue: currentWeight,
    predictedValue: Math.round(predictedWeight * 100) / 100,
    daysToGoal,
    trend,
  }
}

/**
 * Compare two time periods
 */
export async function comparePeriods(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
): Promise<{
  period1: {
    avgCalories: number
    avgProtein: number
    totalWorkouts: number
    avgWeight?: number
  }
  period2: {
    avgCalories: number
    avgProtein: number
    totalWorkouts: number
    avgWeight?: number
  }
  changes: {
    calories: number
    protein: number
    workouts: number
    weight?: number
  }
}> {
  // Get data for period 1
  const period1Dates = getDatesBetween(period1Start, period1End)
  const period1Data = await Promise.all(
    period1Dates.map(date => getDailyLog(date))
  )

  // Get data for period 2
  const period2Dates = getDatesBetween(period2Start, period2End)
  const period2Data = await Promise.all(
    period2Dates.map(date => getDailyLog(date))
  )

  const period1 = {
    avgCalories: period1Data.reduce((sum, d) => sum + d.calories_consumed, 0) / period1Data.length || 0,
    avgProtein: period1Data.reduce((sum, d) => sum + d.protein, 0) / period1Data.length || 0,
    totalWorkouts: period1Data.reduce((sum, d) => sum + d.exercises.length, 0),
  }

  const period2 = {
    avgCalories: period2Data.reduce((sum, d) => sum + d.calories_consumed, 0) / period2Data.length || 0,
    avgProtein: period2Data.reduce((sum, d) => sum + d.protein, 0) / period2Data.length || 0,
    totalWorkouts: period2Data.reduce((sum, d) => sum + d.exercises.length, 0),
  }

  const changes = {
    calories: period2.avgCalories - period1.avgCalories,
    protein: period2.avgProtein - period1.avgProtein,
    workouts: period2.totalWorkouts - period1.totalWorkouts,
  }

  return { period1, period2, changes }
}

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(format(d, 'yyyy-MM-dd'))
  }
  
  return dates
}

