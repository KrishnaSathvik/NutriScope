import { getDailyLog } from './dailyLogs'
import { getWeightLogs } from './weightTracking'
import { getAlcoholLogs } from './alcohol'
import { getSleepLogs } from './sleep'
import { format, subDays } from 'date-fns'
import { formatSleepDuration } from '@/utils/format'

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
  
  // Get weight logs from a wider range to find most recent weight for each day
  const weightLogs = await getWeightLogs(
    format(subDays(startDate, 7), 'yyyy-MM-dd'), // Get weights from 7 days before start to handle gaps
    format(endDate, 'yyyy-MM-dd')
  )

  // Sort weight logs by date (oldest first) to find most recent weight for each day
  const sortedWeightLogs = [...weightLogs].sort((a, b) => {
    const dateA = new Date(a.date + 'T00:00:00').getTime()
    const dateB = new Date(b.date + 'T00:00:00').getTime()
    return dateA - dateB
  })

  const correlationData: CorrelationData[] = []
  const calories: number[] = []
  const weights: number[] = []

  // Iterate through days from oldest to newest (forward in time)
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(endDate, i), 'yyyy-MM-dd')
    const dailyLog = await getDailyLog(date)
    
    // Skip if no meals logged
    if (dailyLog.calories_consumed === 0) continue
    
    // Find the most recent weight log on or before this date
    const currentDate = new Date(date + 'T00:00:00').getTime()
    let mostRecentWeight: number | null = null
    
    // Search backwards through sorted weight logs to find the most recent one <= current date
    for (let j = sortedWeightLogs.length - 1; j >= 0; j--) {
      const weightLogDateStr = sortedWeightLogs[j].date
      if (!weightLogDateStr) continue
      const weightLogDate = new Date(weightLogDateStr + 'T00:00:00').getTime()
      if (!isNaN(weightLogDate) && weightLogDate <= currentDate) {
        mostRecentWeight = sortedWeightLogs[j].weight
        break
      }
    }
    
    // Use most recent weight if available (even if weight wasn't logged on this exact day)
    if (mostRecentWeight !== null && mostRecentWeight > 0) {
      correlationData.push({
        x: dailyLog.calories_consumed,
        y: mostRecentWeight,
        date,
      })
      calories.push(dailyLog.calories_consumed)
      weights.push(mostRecentWeight)
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
 * Get alcohol vs weight correlation and impact analysis
 */
export async function getAlcoholWeightImpact(
  days: number = 30,
  profile?: { goal?: string; calorie_target?: number }
): Promise<{
  correlation: number
  data: CorrelationData[]
  insight: string
  averageAlcoholOnWeightGainDays: number
  averageAlcoholOnWeightLossDays: number
  impactPrediction: string
  hasEnoughData?: boolean
  dataPointsCount?: number
}> {
  const endDate = new Date()
  const startDate = subDays(endDate, days)
  
  // Get weight logs
  const weightLogs = await getWeightLogs(
    format(subDays(startDate, 7), 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  )

  const sortedWeightLogs = [...weightLogs].sort((a, b) => {
    const dateA = new Date(a.date + 'T00:00:00').getTime()
    const dateB = new Date(b.date + 'T00:00:00').getTime()
    return dateA - dateB
  })

  const alcoholOnWeightGainDays: number[] = []
  const alcoholOnWeightLossDays: number[] = []
  const dailyData: Array<{ date: string; alcohol: number; weight: number | null; weightChange: number | null }> = []
  
  // First pass: collect all data (including days without alcohol) and calculate weight changes
  let previousWeight: number | null = null
  
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(endDate, i), 'yyyy-MM-dd')
    const alcoholLogs = await getAlcoholLogs(date).catch(() => [])
    const totalAlcohol = alcoholLogs.reduce((sum, log) => sum + log.amount, 0)
    
    // Find weight for this date
    const currentDate = new Date(date + 'T00:00:00').getTime()
    let currentWeight: number | null = null
    
    for (let j = sortedWeightLogs.length - 1; j >= 0; j--) {
      const weightLogDateStr = sortedWeightLogs[j].date
      if (!weightLogDateStr) continue
      const weightLogDate = new Date(weightLogDateStr + 'T00:00:00').getTime()
      if (!isNaN(weightLogDate) && weightLogDate <= currentDate) {
        currentWeight = sortedWeightLogs[j].weight
        break
      }
    }
    
    // Calculate weight change from previous day
    const weightChange = previousWeight !== null && currentWeight !== null 
      ? currentWeight - previousWeight 
      : null
    
    dailyData.push({
      date,
      alcohol: totalAlcohol,
      weight: currentWeight,
      weightChange,
    })
    
    if (currentWeight !== null && currentWeight > 0) {
      previousWeight = currentWeight
    }
  }

  // Second pass: calculate correlation using weight changes vs alcohol
  // Only include days that actually have alcohol consumption for meaningful correlation
  // Also track alcohol on weight change days for averages
  const correlationData: CorrelationData[] = []
  const alcoholAmountsForCorrelation: number[] = []
  const weightChangesForCorrelation: number[] = []
  
  for (let i = 0; i < dailyData.length; i++) {
    const day = dailyData[i]
    if (day.weightChange !== null && day.weight !== null) {
      // Track alcohol on weight change days (for averages)
      if (day.alcohol > 0) {
        if (day.weightChange > 0.1) {
          alcoholOnWeightGainDays.push(day.alcohol)
        } else if (day.weightChange < -0.1) {
          alcoholOnWeightLossDays.push(day.alcohol)
        }
      }
      
      // Only include days WITH alcohol for correlation calculation
      // This gives a meaningful correlation: does more alcohol correlate with weight changes?
      if (day.alcohol > 0) {
        correlationData.push({
          x: day.alcohol,
          y: day.weightChange,
          date: day.date,
        })
        alcoholAmountsForCorrelation.push(day.alcohol)
        weightChangesForCorrelation.push(day.weightChange)
      }
    }
  }

  // Calculate correlation between alcohol amount and weight change
  // Only calculate if we have at least 5 days with alcohol (meaningful sample size)
  // Positive correlation = more alcohol associated with weight gain
  // Negative correlation = more alcohol associated with weight loss
  const hasEnoughDataForCorrelation = correlationData.length >= 5
  const hasLimitedDataForCorrelation = correlationData.length >= 3 && correlationData.length < 5
  const correlation = correlationData.length >= 5 
    ? calculateCorrelation(alcoholAmountsForCorrelation, weightChangesForCorrelation)
    : correlationData.length >= 3
    ? calculateCorrelation(alcoholAmountsForCorrelation, weightChangesForCorrelation) // Allow 3+ but mark as limited
    : null // Not enough data for meaningful correlation
  
  const avgAlcoholOnGain = alcoholOnWeightGainDays.length > 0
    ? alcoholOnWeightGainDays.reduce((a, b) => a + b, 0) / alcoholOnWeightGainDays.length
    : 0
  const avgAlcoholOnLoss = alcoholOnWeightLossDays.length > 0
    ? alcoholOnWeightLossDays.reduce((a, b) => a + b, 0) / alcoholOnWeightLossDays.length
    : 0

  // Calculate average alcohol consumption and calories from alcohol
  const daysWithAlcohol = dailyData.filter(d => d.alcohol > 0)
  const avgAlcoholPerDay = daysWithAlcohol.length > 0
    ? daysWithAlcohol.reduce((sum, d) => sum + d.alcohol, 0) / daysWithAlcohol.length
    : 0
  const avgAlcoholPerWeek = avgAlcoholPerDay * 7
  
  // Get average calories from alcohol (120 cal per standard drink)
  const caloriesPerDrink = 120
  const avgAlcoholCaloriesPerDay = avgAlcoholPerDay * caloriesPerDrink
  const avgAlcoholCaloriesPerWeek = avgAlcoholPerWeek * caloriesPerDrink

  let insight = ''
  let impactPrediction = ''
  
  // Generate personalized prediction based on user goals and actual consumption
  if (profile?.goal && profile?.calorie_target && avgAlcoholPerDay > 0) {
    // Use calculateAlcoholWeightImpact for personalized predictions
    const impact = calculateAlcoholWeightImpact(
      avgAlcoholPerDay,
      profile.calorie_target,
      profile.calorie_target * 0.8, // Estimate average daily calories consumed (80% of target)
      profile.goal
    )
    
    // Build personalized prediction based on correlation AND impact
    // Only use correlation if we have enough data points
    if (correlation !== null && correlation > 0.3) {
      insight = 'Alcohol consumption shows a positive correlation with weight. Higher alcohol intake may be contributing to weight gain.'
      if (avgAlcoholOnGain > 0) {
        impactPrediction = `On days with weight gain, you consumed ${avgAlcoholOnGain.toFixed(1)} drinks on average. Your typical ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories. ${impact.projectedWeeklyImpact}`
      } else {
        impactPrediction = `Your typical ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories. ${impact.projectedWeeklyImpact}`
      }
    } else if (correlation !== null && correlation < -0.3) {
      // Negative correlation: more alcohol associated with weight loss
      // This could mean alcohol is replacing meals (calorie deficit) or other factors
      if (profile.goal === 'lose_weight' || profile.goal === 'reduce_body_fat') {
        insight = 'Alcohol consumption shows a negative correlation with weight. More alcohol is associated with weight loss in your data, which may indicate alcohol is replacing meals and creating a calorie deficit.'
      } else {
        insight = 'Alcohol consumption shows a negative correlation with weight. This may indicate alcohol is replacing meals or affecting metabolism.'
      }
      if (avgAlcoholOnLoss > 0 && avgAlcoholOnLoss < avgAlcoholPerDay) {
        // Weight loss days had less alcohol than average - reducing alcohol helps
        impactPrediction = `On days with weight loss, you consumed ${avgAlcoholOnLoss.toFixed(1)} drinks on average (less than your typical ${avgAlcoholPerDay.toFixed(1)} drinks/day). Reducing alcohol intake may support your weight loss goals. ${impact.recommendation}`
      } else if (avgAlcoholOnLoss === 0 && avgAlcoholPerDay > 0) {
        // Weight loss days had no alcohol - not drinking helps
        impactPrediction = `On days with weight loss, you had no alcohol, while your typical consumption is ${avgAlcoholPerDay.toFixed(1)} drinks/day (~${Math.round(avgAlcoholCaloriesPerDay)} calories). Reducing alcohol intake may support your weight loss goals.`
      } else if (avgAlcoholOnLoss >= avgAlcoholPerDay && avgAlcoholPerDay > 0) {
        // Negative correlation but weight loss days had MORE alcohol - alcohol may be replacing meals
        if (profile.goal === 'lose_weight' || profile.goal === 'reduce_body_fat') {
          impactPrediction = `On days with weight loss, you consumed ${avgAlcoholOnLoss.toFixed(1)} drinks on average. While this correlation suggests alcohol may be creating a calorie deficit by replacing meals, alcohol lacks essential nutrients. Focus on nutrient-dense foods for sustainable weight loss.`
        } else {
          impactPrediction = `On days with weight loss, average alcohol was ${avgAlcoholOnLoss.toFixed(1)} drinks. This correlation may indicate alcohol is replacing meals, but ensure you're getting adequate nutrients from food.`
        }
      } else {
        // Negative correlation but similar consumption - focus on overall impact
        impactPrediction = `Your typical ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories. ${impact.recommendation}`
      }
    } else if (correlation !== null && correlation > 0.1) {
      insight = 'Moderate positive correlation: Alcohol may be contributing to calorie surplus and weight gain.'
      impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories daily (${Math.round(avgAlcoholCaloriesPerWeek)} cal/week). ${impact.projectedWeeklyImpact || impact.recommendation}`
    } else if (correlation !== null) {
      // Weak correlation - still provide personalized impact
      insight = hasLimitedDataForCorrelation 
        ? 'Limited data: Alcohol consumption shows a weak correlation with weight changes. More data needed for reliable analysis.'
        : 'Weak correlation: Alcohol consumption doesn\'t show a strong direct relationship with weight changes in your data.'
      if (profile.goal === 'lose_weight' || profile.goal === 'reduce_body_fat') {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories. ${impact.projectedWeeklyImpact || 'Monitor your intake to stay within your calorie deficit for weight loss.'}`
      } else if (profile.goal === 'gain_muscle' || profile.goal === 'gain_weight') {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories toward your surplus, but alcohol lacks protein needed for muscle growth. ${impact.recommendation}`
      } else {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories (${Math.round(avgAlcoholCaloriesPerWeek)} cal/week). ${impact.recommendation}`
      }
    } else {
      // Not enough data for correlation - provide general impact
      insight = correlationData.length > 0
        ? `Limited data: Only ${correlationData.length} day${correlationData.length !== 1 ? 's' : ''} with alcohol consumption. More data needed for correlation analysis.`
        : 'Insufficient data: Need at least 3 days with alcohol consumption for correlation analysis.'
      if (profile.goal === 'lose_weight' || profile.goal === 'reduce_body_fat') {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories. ${impact.projectedWeeklyImpact || 'Monitor your intake to stay within your calorie deficit for weight loss.'}`
      } else if (profile.goal === 'gain_muscle' || profile.goal === 'gain_weight') {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories toward your surplus, but alcohol lacks protein needed for muscle growth. ${impact.recommendation}`
      } else {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories (${Math.round(avgAlcoholCaloriesPerWeek)} cal/week). ${impact.recommendation}`
      }
    }
  } else {
    // Fallback to correlation-based predictions if no profile data
    if (correlation !== null && correlation > 0.3) {
      insight = 'Alcohol consumption shows a positive correlation with weight. Higher alcohol intake may be contributing to weight gain.'
      impactPrediction = `On days with weight gain, average alcohol was ${avgAlcoholOnGain.toFixed(1)} drinks. Consider reducing alcohol intake to support weight loss goals.`
    } else if (correlation !== null && correlation < -0.3) {
      // Negative correlation: more alcohol associated with weight loss
      insight = 'Alcohol consumption shows a negative correlation with weight. More alcohol is associated with weight loss in your data, which may indicate alcohol is replacing meals and creating a calorie deficit.'
      if (avgAlcoholOnLoss === 0 && avgAlcoholPerDay > 0) {
        impactPrediction = `On days with weight loss, you had no alcohol, while your typical consumption is ${avgAlcoholPerDay.toFixed(1)} drinks/day. Reducing alcohol intake may support your weight loss goals.`
      } else if (avgAlcoholOnLoss > 0 && avgAlcoholOnLoss < avgAlcoholPerDay) {
        impactPrediction = `On days with weight loss, average alcohol was ${avgAlcoholOnLoss.toFixed(1)} drinks (less than your typical ${avgAlcoholPerDay.toFixed(1)} drinks/day). Reducing alcohol intake may support your weight loss goals.`
      } else if (avgAlcoholOnLoss >= avgAlcoholPerDay && avgAlcoholPerDay > 0) {
        impactPrediction = `On days with weight loss, average alcohol was ${avgAlcoholOnLoss.toFixed(1)} drinks. While this correlation suggests alcohol may be creating a calorie deficit by replacing meals, alcohol lacks essential nutrients. Focus on nutrient-dense foods for sustainable weight loss.`
      } else {
        impactPrediction = `On days with weight loss, average alcohol was ${avgAlcoholOnLoss.toFixed(1)} drinks. This correlation may indicate alcohol is replacing meals, but ensure you're getting adequate nutrients from food.`
      }
    } else if (correlation !== null && correlation > 0.1) {
      insight = 'Moderate positive correlation: Alcohol may be contributing to calorie surplus and weight gain.'
      if (avgAlcoholOnGain > 0) {
        impactPrediction = `Average alcohol on weight gain days: ${avgAlcoholOnGain.toFixed(1)} drinks. Alcohol adds empty calories that can hinder weight loss.`
      } else {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories. Alcohol adds empty calories that can hinder weight loss.`
      }
    } else if (correlation !== null) {
      insight = hasLimitedDataForCorrelation
        ? `Limited data: Only ${correlationData.length} day${correlationData.length !== 1 ? 's' : ''} with alcohol consumption. More data needed for reliable correlation analysis.`
        : 'Weak correlation: Alcohol consumption doesn\'t show a strong direct relationship with weight changes in your data.'
      if (avgAlcoholPerDay > 0) {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories (${Math.round(avgAlcoholCaloriesPerWeek)} cal/week). Monitor your intake to stay within your calorie goals.`
      } else {
        impactPrediction = 'Alcohol adds calories (7 cal/g) that count toward your daily total. Monitor your intake to stay within calorie goals.'
      }
    } else {
      // Not enough data for correlation
      insight = correlationData.length > 0
        ? `Limited data: Only ${correlationData.length} day${correlationData.length !== 1 ? 's' : ''} with alcohol consumption. Need at least 5 days for meaningful correlation analysis.`
        : 'Insufficient data: Need at least 3 days with alcohol consumption for correlation analysis.'
      if (avgAlcoholPerDay > 0) {
        impactPrediction = `Your average ${avgAlcoholPerDay.toFixed(1)} drinks/day adds ~${Math.round(avgAlcoholCaloriesPerDay)} calories (${Math.round(avgAlcoholCaloriesPerWeek)} cal/week). Monitor your intake to stay within your calorie goals.`
      } else {
        impactPrediction = 'Alcohol adds calories (7 cal/g) that count toward your daily total. Monitor your intake to stay within calorie goals.'
      }
    }
  }

  return {
    correlation: correlation || 0, // Return 0 if null for backward compatibility
    data: correlationData,
    insight,
    averageAlcoholOnWeightGainDays: avgAlcoholOnGain,
    averageAlcoholOnWeightLossDays: avgAlcoholOnLoss,
    impactPrediction,
    hasEnoughData: hasEnoughDataForCorrelation,
    dataPointsCount: correlationData.length,
  }
}

/**
 * Calculate alcohol's impact on weight loss goals
 */
export function calculateAlcoholWeightImpact(
  alcoholDrinks: number,
  calorieTarget: number,
  currentCalories: number,
  goal: string
): {
  alcoholCalories: number
  impactOnGoal: string
  recommendation: string
  projectedWeeklyImpact: string
} {
  // Average calories per standard drink (varies by type, but ~100-150 cal average)
  const caloriesPerDrink = 120
  const alcoholCalories = alcoholDrinks * caloriesPerDrink
  
  const totalWithAlcohol = currentCalories + alcoholCalories
  const remainingCalories = calorieTarget - totalWithAlcohol
  
  let impactOnGoal = ''
  let recommendation = ''
  let projectedWeeklyImpact = ''
  
  if (goal === 'lose_weight' || goal === 'reduce_body_fat') {
    const weeklyAlcoholCalories = alcoholDrinks * caloriesPerDrink * 7
    const weeklyDeficitImpact = weeklyAlcoholCalories / 7700 // 7700 cal = 1kg
    const monthlyImpact = weeklyDeficitImpact * 4.33
    
    if (remainingCalories < -500) {
      impactOnGoal = `Alcohol adds ${alcoholCalories} calories, putting you ${Math.abs(remainingCalories)} over your target.`
      recommendation = 'Consider reducing alcohol intake or adjusting meals to stay within your deficit.'
    } else if (remainingCalories < 0) {
      impactOnGoal = `Alcohol adds ${alcoholCalories} calories, slightly over your target.`
      recommendation = 'Monitor your intake to maintain your calorie deficit for weight loss.'
    } else {
      impactOnGoal = `Alcohol adds ${alcoholCalories} calories. You have ${remainingCalories} calories remaining.`
      recommendation = 'Good balance! Alcohol fits within your deficit.'
    }
    
    if (weeklyAlcoholCalories > 0) {
      projectedWeeklyImpact = `At this rate, alcohol could slow weight loss by ~${weeklyDeficitImpact.toFixed(2)}kg/week (${monthlyImpact.toFixed(2)}kg/month).`
    }
  } else if (goal === 'gain_muscle' || goal === 'gain_weight') {
    impactOnGoal = `Alcohol adds ${alcoholCalories} calories toward your surplus goal.`
    recommendation = 'Alcohol provides calories but lacks protein. Prioritize protein-rich foods for muscle gain.'
    projectedWeeklyImpact = `Alcohol contributes calories but won't support muscle growth - focus on protein intake.`
  } else {
    impactOnGoal = `Alcohol adds ${alcoholCalories} calories to your daily total.`
    recommendation = 'Moderate alcohol intake can fit into a balanced diet. Stay within your calorie target.'
    projectedWeeklyImpact = 'Monitor alcohol intake to maintain your current weight.'
  }
  
  return {
    alcoholCalories,
    impactOnGoal,
    recommendation,
    projectedWeeklyImpact,
  }
}

/**
 * Get sleep vs weight correlation and impact analysis
 */
export async function getSleepWeightImpact(
  days: number = 30,
  profile?: { goal?: string; calorie_target?: number }
): Promise<{
  correlation: number
  data: CorrelationData[]
  insight: string
  averageSleepOnWeightGainDays: number
  averageSleepOnWeightLossDays: number
  impactPrediction: string
  averageSleepHours: number
  hasEnoughData?: boolean
  dataPointsCount?: number
}> {
  const endDate = new Date()
  const startDate = subDays(endDate, days)
  
  // Get weight logs
  const weightLogs = await getWeightLogs(
    format(subDays(startDate, 7), 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  )

  const sortedWeightLogs = [...weightLogs].sort((a, b) => {
    const dateA = new Date(a.date + 'T00:00:00').getTime()
    const dateB = new Date(b.date + 'T00:00:00').getTime()
    return dateA - dateB
  })

  const correlationData: CorrelationData[] = []
  const sleepHours: number[] = []
  const weightChanges: number[] = []
  const sleepOnWeightGainDays: number[] = []
  const sleepOnWeightLossDays: number[] = []
  const dailyData: Array<{ date: string; sleep: number | null; weight: number | null; weightChange: number | null }> = []
  
  // First pass: collect all data and calculate weight changes
  let previousWeight: number | null = null
  
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(endDate, i), 'yyyy-MM-dd')
    const sleepLogs = await getSleepLogs(date).catch(() => [])
    const totalSleep = sleepLogs.length > 0 ? sleepLogs[0].sleep_duration : null
    
    // Find weight for this date
    const currentDate = new Date(date + 'T00:00:00').getTime()
    let currentWeight: number | null = null
    
    for (let j = sortedWeightLogs.length - 1; j >= 0; j--) {
      const weightLogDateStr = sortedWeightLogs[j].date
      if (!weightLogDateStr) continue
      const weightLogDate = new Date(weightLogDateStr + 'T00:00:00').getTime()
      if (!isNaN(weightLogDate) && weightLogDate <= currentDate) {
        currentWeight = sortedWeightLogs[j].weight
        break
      }
    }
    
    // Calculate weight change from previous day
    const weightChange = previousWeight !== null && currentWeight !== null 
      ? currentWeight - previousWeight 
      : null
    
    dailyData.push({
      date,
      sleep: totalSleep,
      weight: currentWeight,
      weightChange,
    })
    
    if (currentWeight !== null && currentWeight > 0) {
      previousWeight = currentWeight
    }
  }

  // Second pass: calculate correlation using weight changes vs sleep
  for (let i = 0; i < dailyData.length; i++) {
    const day = dailyData[i]
    if (day.weightChange !== null && day.sleep !== null && day.sleep > 0) {
      correlationData.push({
        x: day.sleep,
        y: day.weightChange,
        date: day.date,
      })
      sleepHours.push(day.sleep)
      weightChanges.push(day.weightChange)
      
      // Track sleep on weight change days
      if (day.weightChange > 0.1) {
        sleepOnWeightGainDays.push(day.sleep)
      } else if (day.weightChange < -0.1) {
        sleepOnWeightLossDays.push(day.sleep)
      }
    }
  }

  // Calculate correlation (negative correlation = more sleep associated with weight loss)
  // Only calculate if we have at least 5 days with sleep (meaningful sample size)
  const hasEnoughDataForCorrelation = correlationData.length >= 5
  const hasLimitedDataForCorrelation = correlationData.length >= 3 && correlationData.length < 5
  const correlation = correlationData.length >= 5 
    ? calculateCorrelation(sleepHours, weightChanges)
    : correlationData.length >= 3
    ? calculateCorrelation(sleepHours, weightChanges) // Allow 3+ but mark as limited
    : null // Not enough data for meaningful correlation
  
  const avgSleepOnGain = sleepOnWeightGainDays.length > 0
    ? sleepOnWeightGainDays.reduce((a, b) => a + b, 0) / sleepOnWeightGainDays.length
    : 0
  const avgSleepOnLoss = sleepOnWeightLossDays.length > 0
    ? sleepOnWeightLossDays.reduce((a, b) => a + b, 0) / sleepOnWeightLossDays.length
    : 0

  // Calculate average sleep hours
  const daysWithSleep = dailyData.filter(d => d.sleep !== null && d.sleep > 0)
  const avgSleepHours = daysWithSleep.length > 0
    ? daysWithSleep.reduce((sum, d) => sum + (d.sleep || 0), 0) / daysWithSleep.length
    : 0

  let insight = ''
  let impactPrediction = ''
  
  // Generate personalized prediction based on user goals and actual sleep patterns
  if (profile?.goal === 'lose_weight' || profile?.goal === 'reduce_body_fat') {
    if (correlation !== null && correlation < -0.3) {
      insight = 'Sleep shows a strong negative correlation with weight. More sleep is associated with better weight loss results.'
      impactPrediction = `On days with weight loss, average sleep was ${formatSleepDuration(avgSleepOnLoss)}. Getting adequate sleep (7-9 hours) supports your weight loss goals by regulating hormones and reducing cravings.`
    } else if (correlation !== null && correlation < -0.1) {
      insight = 'Sleep shows a moderate negative correlation with weight. Better sleep may support your weight loss journey.'
      impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}. Aim for 7-9 hours per night to optimize metabolism and reduce stress-related eating.`
    } else if (correlation !== null) {
      // Weak correlation - still provide personalized impact
      insight = hasLimitedDataForCorrelation
        ? 'Limited data: Sleep shows a weak correlation with weight changes. More data needed for reliable analysis.'
        : 'Sleep patterns show a weak correlation with weight changes in your data.'
      if (avgSleepHours < 7) {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}, which is below the recommended 7-9 hours. Poor sleep can increase cortisol, affect hunger hormones, and slow metabolism.`
      } else if (avgSleepHours > 9) {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}. Good sleep helps regulate hormones that control appetite and metabolism.`
      } else {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}. Maintaining consistent sleep (7-9 hours) supports overall health and weight management.`
      }
    } else {
      // Not enough data for correlation - provide general impact
      insight = correlationData.length > 0
        ? `Limited data: Only ${correlationData.length} day${correlationData.length !== 1 ? 's' : ''} with sleep logged. More data needed for correlation analysis.`
        : 'Insufficient data: Need at least 3 days with sleep logged for correlation analysis.'
      if (avgSleepHours < 7) {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}, which is below the recommended 7-9 hours. Poor sleep can increase cortisol, affect hunger hormones, and slow metabolism.`
      } else if (avgSleepHours > 9) {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}. Good sleep helps regulate hormones that control appetite and metabolism.`
      } else if (avgSleepHours > 0) {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}. Aim for 7-9 hours per night for optimal health and weight management.`
      } else {
        impactPrediction = 'Adequate sleep (7-9 hours) supports healthy metabolism, hormone regulation, and weight management.'
      }
    }
  } else {
    // Fallback to correlation-based predictions if no profile data
    if (correlation !== null && correlation < -0.3) {
      insight = 'Sleep shows a strong negative correlation with weight. More sleep is associated with weight loss.'
      impactPrediction = `On days with weight loss, average sleep was ${formatSleepDuration(avgSleepOnLoss)}. Adequate sleep supports healthy weight management.`
    } else if (correlation !== null && correlation > 0.3) {
      insight = 'Sleep shows a positive correlation with weight. This may indicate sleep quality issues or other factors affecting both sleep and weight.'
      impactPrediction = `On days with weight gain, average sleep was ${formatSleepDuration(avgSleepOnGain)}. Consider improving sleep quality and duration.`
    } else if (correlation !== null) {
      insight = hasLimitedDataForCorrelation
        ? `Limited data: Only ${correlationData.length} day${correlationData.length !== 1 ? 's' : ''} with sleep logged. More data needed for reliable correlation analysis.`
        : 'Sleep patterns show a weak correlation with weight changes in your data.'
      if (avgSleepHours > 0) {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}. Aim for 7-9 hours per night for optimal health and weight management.`
      } else {
        impactPrediction = 'Adequate sleep (7-9 hours) supports healthy metabolism, hormone regulation, and weight management.'
      }
    } else {
      // Not enough data for correlation
      insight = correlationData.length > 0
        ? `Limited data: Only ${correlationData.length} day${correlationData.length !== 1 ? 's' : ''} with sleep logged. Need at least 5 days for meaningful correlation analysis.`
        : 'Insufficient data: Need at least 3 days with sleep logged for correlation analysis.'
      if (avgSleepHours < 7) {
        impactPrediction = `Your average sleep is ${formatSleepDuration(avgSleepHours)}. Aim for 7-9 hours per night for optimal health and weight management.`
      } else if (avgSleepHours > 0) {
        impactPrediction = 'Adequate sleep (7-9 hours) supports healthy metabolism, hormone regulation, and weight management.'
      } else {
        impactPrediction = 'Adequate sleep (7-9 hours) supports healthy metabolism, hormone regulation, and weight management.'
      }
    }
  }

  return {
    correlation: correlation || 0, // Return 0 if null for backward compatibility
    data: correlationData,
    insight,
    averageSleepOnWeightGainDays: avgSleepOnGain,
    averageSleepOnWeightLossDays: avgSleepOnLoss,
    impactPrediction,
    averageSleepHours: avgSleepHours,
    hasEnoughData: hasEnoughDataForCorrelation,
    dataPointsCount: correlationData.length,
  }
}

/**
 * Calculate sleep's impact on weight loss goals
 */
export function calculateSleepWeightImpact(
  sleepHours: number,
  goal: string
): {
  sleepStatus: string
  impactOnGoal: string
  recommendation: string
  projectedImpact: string
} {
  let sleepStatus = ''
  let impactOnGoal = ''
  let recommendation = ''
  let projectedImpact = ''
  
  // Sleep quality categories
  const isOptimal = sleepHours >= 7 && sleepHours <= 9
  const isInsufficient = sleepHours < 7
  const isExcessive = sleepHours > 9
  
  if (goal === 'lose_weight' || goal === 'reduce_body_fat') {
    if (isOptimal) {
      sleepStatus = 'Optimal'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}, which is optimal for weight loss.`
      recommendation = 'Maintain this sleep schedule. Adequate sleep helps regulate hormones that control appetite and metabolism.'
      projectedImpact = 'Optimal sleep supports healthy weight loss by reducing cortisol, improving insulin sensitivity, and regulating hunger hormones.'
    } else if (isInsufficient) {
      sleepStatus = 'Insufficient'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}, which is below the recommended 7-9 hours.`
      recommendation = 'Aim for 7-9 hours of sleep per night. Poor sleep can increase cortisol, affect hunger hormones (ghrelin/leptin), and slow metabolism.'
      projectedImpact = 'Insufficient sleep may slow weight loss progress by increasing stress hormones and cravings. Improving sleep could accelerate your results.'
    } else if (isExcessive) {
      sleepStatus = 'Excessive'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}, which is above the recommended range.`
      recommendation = 'While adequate sleep is important, excessive sleep may indicate other health issues. Aim for 7-9 hours consistently.'
      projectedImpact = 'Very long sleep durations may be associated with underlying health conditions. Consult a healthcare provider if this persists.'
    }
  } else if (goal === 'gain_muscle') {
    if (isOptimal) {
      sleepStatus = 'Optimal'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}, which is optimal for muscle recovery and growth.`
      recommendation = 'Maintain this sleep schedule. Sleep is crucial for muscle protein synthesis and recovery.'
      projectedImpact = 'Optimal sleep supports muscle growth by maximizing growth hormone release and recovery.'
    } else if (isInsufficient) {
      sleepStatus = 'Insufficient'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}, which may limit muscle recovery.`
      recommendation = 'Aim for 7-9 hours of sleep. Muscle growth occurs during sleep, so adequate rest is essential.'
      projectedImpact = 'Insufficient sleep may slow muscle growth by reducing growth hormone production and recovery.'
    } else {
      sleepStatus = 'Good'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}.`
      recommendation = 'Sleep supports muscle recovery and growth. Maintain consistent sleep patterns.'
      projectedImpact = 'Adequate sleep is essential for optimal muscle protein synthesis and recovery.'
    }
  } else {
    if (isOptimal) {
      sleepStatus = 'Optimal'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}, which is optimal for overall health.`
      recommendation = 'Maintain this sleep schedule for optimal health and well-being.'
      projectedImpact = 'Optimal sleep supports overall health, cognitive function, and metabolism.'
    } else {
      sleepStatus = 'Needs Improvement'
      impactOnGoal = `You're getting ${formatSleepDuration(sleepHours)}.`
      recommendation = 'Aim for 7-9 hours of sleep per night for optimal health and well-being.'
      projectedImpact = 'Adequate sleep supports overall health, immune function, and metabolism.'
    }
  }
  
  return {
    sleepStatus,
    impactOnGoal,
    recommendation,
    projectedImpact,
  }
}

/**
 * Get goal achievement insights from pre-fetched daily logs data
 */
export function getGoalAchievementInsightsFromData(
  dailyLogs: Array<{ calories: number; protein: number; water: number; fullDate: string }>,
  calorieTarget: number = 2000,
  proteinTarget: number = 150,
  waterGoal: number = 2000
): {
  calorieGoalDays: number
  proteinGoalDays: number
  waterGoalDays: number
  totalDays: number
  calorieAchievementRate: number
  proteinAchievementRate: number
  waterAchievementRate: number
  insights: string[]
} {
  let calorieGoalDays = 0
  let proteinGoalDays = 0
  let waterGoalDays = 0
  let totalDays = 0
  const insights: string[] = []

  for (const log of dailyLogs) {
    // Only count days with actual data
    if (log.calories > 0 || log.protein > 0 || log.water > 0) {
      totalDays++
      
      // Calories: Count if >= 80% of target OR >= 1500 cal (reasonable minimum for active tracking)
      if (calorieTarget > 0) {
        const calorieThreshold = Math.max(calorieTarget * 0.8, 1500)
        if (log.calories >= calorieThreshold) calorieGoalDays++
      }
      
      // Protein: Count if >= 90% of target (protein is more critical)
      if (proteinTarget > 0 && log.protein >= proteinTarget * 0.9) {
        proteinGoalDays++
      }
      
      // Water: Count if >= 80% of target OR >= 1500ml (reasonable minimum)
      if (waterGoal > 0) {
        const waterThreshold = Math.max(waterGoal * 0.8, 1500)
        if (log.water >= waterThreshold) waterGoalDays++
      }
    }
  }

  const calorieAchievementRate = totalDays > 0 ? (calorieGoalDays / totalDays) * 100 : 0
  const proteinAchievementRate = totalDays > 0 ? (proteinGoalDays / totalDays) * 100 : 0
  const waterAchievementRate = totalDays > 0 ? (waterGoalDays / totalDays) * 100 : 0

  // Generate insights
  if (calorieAchievementRate >= 80) {
    insights.push('Excellent calorie consistency! You\'re hitting your target most days.')
  } else if (calorieAchievementRate >= 60) {
    insights.push('Good calorie tracking. Try to hit your target more consistently.')
  } else if (calorieAchievementRate > 0) {
    insights.push('Focus on meeting your calorie target more often for better results.')
  }

  if (proteinAchievementRate >= 80) {
    insights.push('Great protein intake! You\'re consistently meeting your protein goals.')
  } else if (proteinAchievementRate >= 60) {
    insights.push('Good protein tracking. Aim to hit your target more consistently.')
  }

  if (waterAchievementRate >= 80) {
    insights.push('Excellent hydration! You\'re staying well-hydrated.')
  } else if (waterAchievementRate < 50) {
    insights.push('Try to drink more water throughout the day.')
  }

  return {
    calorieGoalDays,
    proteinGoalDays,
    waterGoalDays,
    totalDays,
    calorieAchievementRate: Math.round(calorieAchievementRate),
    proteinAchievementRate: Math.round(proteinAchievementRate),
    waterAchievementRate: Math.round(waterAchievementRate),
    insights,
  }
}

/**
 * Get weekly patterns and insights from pre-fetched daily logs data
 */
export function getWeeklyPatternsFromData(
  dailyLogs: Array<{ calories: number; protein: number; workouts: number; fullDate: string }>
): {
  bestDay: { date: string; calories: number; protein: number } | null
  worstDay: { date: string; calories: number; protein: number } | null
  workoutDays: number
  restDays: number
  averageWorkoutsPerWeek: number
  insights: string[]
} {
  const dailyStats: Array<{ date: string; calories: number; protein: number; workouts: number }> = []

  for (const log of dailyLogs) {
    if (log.calories > 0 || log.protein > 0) {
      dailyStats.push({
        date: log.fullDate,
        calories: log.calories,
        protein: log.protein,
        workouts: log.workouts,
      })
    }
  }

  if (dailyStats.length === 0) {
    return {
      bestDay: null,
      worstDay: null,
      workoutDays: 0,
      restDays: 0,
      averageWorkoutsPerWeek: 0,
      insights: [],
    }
  }

  // Find best and worst days (based on overall nutrition completeness)
  const bestDay = dailyStats.reduce((best, current) => {
    const bestScore = best.calories + best.protein * 4 // Weight protein more
    const currentScore = current.calories + current.protein * 4
    return currentScore > bestScore ? current : best
  })

  const worstDay = dailyStats.reduce((worst, current) => {
    const worstScore = worst.calories + worst.protein * 4
    const currentScore = current.calories + current.protein * 4
    return currentScore < worstScore ? current : worst
  })

  const workoutDays = dailyStats.filter(d => d.workouts > 0).length
  const restDays = dailyStats.length - workoutDays
  const weeks = Math.max(1, Math.ceil(dailyStats.length / 7))
  const averageWorkoutsPerWeek = workoutDays / weeks

  const insights: string[] = []

  if (averageWorkoutsPerWeek >= 4) {
    insights.push(`You're working out ${averageWorkoutsPerWeek.toFixed(1)} times per week - excellent consistency!`)
  } else if (averageWorkoutsPerWeek >= 2) {
    insights.push(`You're averaging ${averageWorkoutsPerWeek.toFixed(1)} workouts per week. Great start!`)
  } else {
    insights.push(`Try to add more workouts - aim for at least 3-4 per week for best results.`)
  }

  if (workoutDays > 0 && dailyStats.length > 0) {
    const avgProteinOnWorkoutDays = dailyStats
      .filter(d => d.workouts > 0)
      .reduce((sum, d) => sum + d.protein, 0) / workoutDays
    const avgProteinOnRestDays = dailyStats
      .filter(d => d.workouts === 0)
      .reduce((sum, d) => sum + d.protein, 0) / Math.max(1, restDays)

    if (avgProteinOnWorkoutDays > avgProteinOnRestDays * 1.2) {
      insights.push('You\'re eating more protein on workout days - smart strategy!')
    }
  }

  return {
    bestDay: {
      date: bestDay.date,
      calories: bestDay.calories,
      protein: bestDay.protein,
    },
    worstDay: {
      date: worstDay.date,
      calories: worstDay.calories,
      protein: worstDay.protein,
    },
    workoutDays,
    restDays,
    averageWorkoutsPerWeek: Math.round(averageWorkoutsPerWeek * 10) / 10,
    insights,
  }
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


