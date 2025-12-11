import { UserGoal, UserGoalType, UserGoals, ActivityLevel, DietaryPreference } from '@/types'

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 */
function calculateBMR(weight: number, height: number, age: number, isMale: boolean = true): number {
  // Mifflin-St Jeor Equation
  // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
  // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
  const baseBMR = 10 * weight + 6.25 * height - 5 * age
  return isMale ? baseBMR + 5 : baseBMR - 161
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE) based on activity level
 * 
 * Activity Level Multipliers (based on Harris-Benedict/Mifflin-St Jeor activity factors):
 * 
 * - Sedentary (1.2x): Little to no exercise
 *   • Desk job, minimal walking
 *   • BMR × 1.2 = TDEE
 * 
 * - Light (1.375x): Light exercise 1-3 days/week
 *   • Walking, yoga, light workouts
 *   • BMR × 1.375 = TDEE
 * 
 * - Moderate (1.55x): Moderate exercise 3-5 days/week
 *   • 30-60 min workouts, jogging, cycling
 *   • BMR × 1.55 = TDEE
 * 
 * - Active (1.725x): Heavy exercise 6-7 days/week
 *   • Intense training, sports, long runs
 *   • BMR × 1.725 = TDEE
 * 
 * - Very Active (1.9x): Very heavy exercise + physical job
 *   • Athletes, construction workers, 2x daily workouts
 *   • BMR × 1.9 = TDEE
 * 
 * Note: These multipliers account for both exercise and daily activity (NEAT).
 * Users should select based on their typical week, not their best week.
 */
function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,      // Little to no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,       // Moderate exercise 3-5 days/week
    active: 1.725,       // Heavy exercise 6-7 days/week
    very_active: 1.9,    // Very heavy exercise, physical job
  }
  
  return Math.round(bmr * activityMultipliers[activityLevel])
}

/**
 * Calculate target calories based on goal(s), target weight, and timeframe
 * Supports both single goal and multiple goals
 * If targetWeight and timeframeMonths are provided, calculates deficit/surplus based on required weekly weight change
 */
function calculateTargetCalories(
  tdee: number, 
  goal: UserGoal | UserGoals,
  currentWeight?: number,
  targetWeight?: number,
  timeframeMonths?: number
): number {
  // Handle array of goals
  const goals = Array.isArray(goal) ? goal : [goal]
  
  // If no goals, default to maintain
  if (goals.length === 0) {
    return tdee
  }
  
  // If target weight and timeframe are provided, calculate based on required weight change rate
  if (currentWeight && targetWeight && timeframeMonths && currentWeight !== targetWeight) {
    const weightDifference = targetWeight - currentWeight // Positive = gain, Negative = loss
    const totalWeeks = timeframeMonths * 4.33 // Average weeks per month
    const weeklyWeightChangeKg = weightDifference / totalWeeks
    
    // Calculate required calorie adjustment
    // 1 kg ≈ 7700 calories
    // Weekly deficit/surplus needed = weeklyWeightChangeKg * 7700 / 7 days
    const dailyCalorieAdjustment = (weeklyWeightChangeKg * 7700) / 7
    
    // Cap adjustments for safety (max 1000 cal deficit or 500 cal surplus per day)
    const safeAdjustment = Math.max(-1000, Math.min(500, dailyCalorieAdjustment))
    
    // Check if goals align with weight change direction
    const hasWeightLoss = goals.includes('lose_weight') || goals.includes('reduce_body_fat')
    const hasWeightGain = goals.includes('gain_weight')
    const hasMuscleGain = goals.includes('gain_muscle')
    
    // If goals conflict with weight change direction, use goal-based calculation instead
    if ((weightDifference < 0 && (hasWeightGain || hasMuscleGain)) || 
        (weightDifference > 0 && hasWeightLoss)) {
      // Fall back to goal-based calculation
      return calculateTargetCaloriesByGoals(tdee, goals)
    }
    
    return Math.round(tdee + safeAdjustment)
  }
  
  // Fall back to goal-based calculation if no target weight/timeframe
  return calculateTargetCaloriesByGoals(tdee, goals)
}

/**
 * Calculate target calories based on goals only (fallback method)
 */
function calculateTargetCaloriesByGoals(tdee: number, goals: UserGoals): number {
  // Goal adjustments (calorie modifications)
  const goalAdjustments: Record<UserGoalType, number> = {
    lose_weight: -500,           // 500 cal deficit for ~1lb/week loss
    maintain: 0,                 // Maintain current weight
    gain_muscle: 300,            // 300 cal surplus for muscle gain
    gain_weight: 400,            // 400 cal surplus for weight gain
    improve_fitness: -200,       // Slight deficit for body recomposition
    build_endurance: -100,       // Small deficit, focus on performance
    improve_health: 0,           // Maintain for health
    body_recomposition: -200,    // Slight deficit for recomposition
    increase_energy: 100,        // Small surplus for energy
    reduce_body_fat: -400,       // Moderate deficit for fat loss
  }
  
  // Check for conflicting goals
  const hasWeightLoss = goals.includes('lose_weight') || goals.includes('reduce_body_fat')
  const hasWeightGain = goals.includes('gain_weight')
  const hasMuscleGain = goals.includes('gain_muscle')
  const hasRecomp = goals.includes('body_recomposition') || goals.includes('improve_fitness')
  
  // Handle conflicting goals intelligently
  if (hasWeightLoss && hasMuscleGain) {
    // Body recomposition: slight deficit with high protein
    return Math.round(tdee - 200)
  }
  
  if (hasWeightLoss && hasWeightGain) {
    // Conflicting - default to maintain
    return tdee
  }
  
  if (hasRecomp && (hasWeightLoss || hasMuscleGain)) {
    // Recomp takes priority
    return Math.round(tdee - 200)
  }
  
  // Calculate average adjustment for multiple non-conflicting goals
  const adjustments = goals.map(g => goalAdjustments[g] || 0)
  const avgAdjustment = adjustments.reduce((sum, adj) => sum + adj, 0) / adjustments.length
  
  return Math.round(tdee + avgAdjustment)
}

/**
 * Calculate target protein based on goal(s) and weight
 */
function calculateTargetProtein(weight: number, goal: UserGoal | UserGoals, activityLevel: ActivityLevel): number {
  // Handle array of goals
  const goals = Array.isArray(goal) ? goal : [goal]
  
  // Protein recommendations per kg of bodyweight
  const proteinMultipliers: Record<UserGoalType, number> = {
    lose_weight: 2.2,              // Higher protein for weight loss (preserves muscle)
    maintain: 1.6,                  // Standard maintenance
    gain_muscle: 2.0,               // Higher protein for muscle building
    gain_weight: 1.8,               // Moderate-high for weight gain
    improve_fitness: 1.8,           // Moderate-high for fitness improvement
    build_endurance: 1.6,           // Standard for endurance
    improve_health: 1.6,            // Standard for health
    body_recomposition: 2.1,        // High protein for recomposition
    increase_energy: 1.7,            // Moderate for energy
    reduce_body_fat: 2.2,           // High protein for fat loss (preserves muscle)
  }
  
  // Use the highest protein requirement from selected goals
  const proteinValues = goals.map(g => proteinMultipliers[g] || 1.6)
  const maxProteinPerKg = Math.max(...proteinValues)
  
  // Adjust for activity level
  const activityMultiplier = activityLevel === 'very_active' || activityLevel === 'active' ? 1.1 : 1.0
  
  const proteinPerKg = maxProteinPerKg * activityMultiplier
  return Math.round(weight * proteinPerKg)
}

/**
 * Calculate water goal based on weight, activity level, and goal(s)
 */
function calculateWaterGoal(weight: number, activityLevel: ActivityLevel, goal: UserGoal | UserGoals): number {
  // Handle array of goals
  const goals = Array.isArray(goal) ? goal : [goal]
  
  // Base: 30-35ml per kg bodyweight
  let baseWater = weight * 33 // ml
  
  // Adjust for activity level
  const activityAdjustments: Record<ActivityLevel, number> = {
    sedentary: 0,
    light: 200,
    moderate: 400,
    active: 600,
    very_active: 800,
  }
  
  baseWater += activityAdjustments[activityLevel]
  
  // Adjust for goals (weight loss and endurance need more hydration)
  if (goals.includes('lose_weight') || goals.includes('reduce_body_fat')) {
    baseWater += 300
  }
  if (goals.includes('build_endurance')) {
    baseWater += 200
  }
  if (goals.includes('increase_energy')) {
    baseWater += 150
  }
  
  // Round to nearest 100ml
  return Math.round(baseWater / 100) * 100
}

/**
 * Calculate personalized nutrition targets based on user profile
 * Now supports both single goal and multiple goals
 * Also supports target weight and timeframe for personalized deficit/surplus calculation
 */
export function calculatePersonalizedTargets(params: {
  weight: number
  height: number
  age: number
  goal: UserGoal | UserGoals // Accept both single goal and array
  activityLevel: ActivityLevel
  dietaryPreference?: DietaryPreference
  isMale?: boolean
  targetWeight?: number // Optional target weight in kg
  timeframeMonths?: number // Optional timeframe in months
}): {
  calorie_target: number
  protein_target: number
  water_goal: number
  bmr: number
  tdee: number
  calorie_deficit: number // Negative for deficit, positive for surplus
  explanation: string
} {
  const { weight, height, age, goal, activityLevel, isMale = true, targetWeight, timeframeMonths } = params
  
  // Normalize goal to array
  const goals = Array.isArray(goal) ? goal : [goal]

  // Calculate BMR
  const bmr = calculateBMR(weight, height, age, isMale)
  
  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel)
  
  // Calculate target calories (handles multiple goals + target weight/timeframe)
  const calorie_target = calculateTargetCalories(tdee, goals, weight, targetWeight, timeframeMonths)
  
  // Calculate calorie deficit/surplus (negative = deficit, positive = surplus)
  const calorie_deficit = calorie_target - tdee
  
  // Calculate target protein (handles multiple goals)
  const protein_target = calculateTargetProtein(weight, goals, activityLevel)
  
  // Calculate water goal (handles multiple goals)
  const water_goal = calculateWaterGoal(weight, activityLevel, goals)

  // Generate personalized explanation
  const goalNames: Record<UserGoalType, string> = {
    lose_weight: 'Lose Weight',
    gain_muscle: 'Gain Muscle',
    gain_weight: 'Gain Weight',
    maintain: 'Maintain Weight',
    improve_fitness: 'Improve Fitness',
    build_endurance: 'Build Endurance',
    improve_health: 'Improve Health',
    body_recomposition: 'Body Recomposition',
    increase_energy: 'Increase Energy',
    reduce_body_fat: 'Reduce Body Fat',
  }
  
  let explanation = `Based on your profile`
  if (goals.length > 1) {
    explanation += ` and goals (${goals.map(g => goalNames[g]).join(', ')})`
  } else {
    explanation += ` and goal: ${goalNames[goals[0]]}`
  }
  explanation += `, here are your personalized daily targets:\n\n`
  
  // Add goal-specific context
  const hasWeightLoss = goals.includes('lose_weight') || goals.includes('reduce_body_fat')
  const hasMuscleGain = goals.includes('gain_muscle')
  const hasWeightGain = goals.includes('gain_weight')
  const hasRecomp = goals.includes('body_recomposition') || goals.includes('improve_fitness')
  
  if (targetWeight && timeframeMonths && weight !== targetWeight) {
    // Use target weight/timeframe-based explanation
    const weightDiff = targetWeight - weight
    const weeklyChange = Math.abs(weightDiff / (timeframeMonths * 4.33))
    
    // Add TDEE breakdown
    explanation += `How we calculate your daily burn (TDEE):\n`
    explanation += `• BMR (Base Metabolic Rate): ${bmr.toFixed(0)} cal/day\n`
    explanation += `  (Calculated using Mifflin-St Jeor: based on your weight, height, age, and gender)\n`
    explanation += `• Activity Multiplier: ${activityLevel === 'sedentary' ? '1.2x' : activityLevel === 'light' ? '1.375x' : activityLevel === 'moderate' ? '1.55x' : activityLevel === 'active' ? '1.725x' : '1.9x'} (${activityLevel.replace('_', ' ')})\n`
    explanation += `• TDEE (Total Daily Energy Expenditure): ${tdee} cal/day\n`
    explanation += `  (This is an ESTIMATE - actual burn varies based on muscle mass, genetics, NEAT, etc.)\n\n`
    
    if (weightDiff < 0) {
      explanation += `To reach your target weight of ${targetWeight.toFixed(1)} kg in ${timeframeMonths} month${timeframeMonths > 1 ? 's' : ''}:\n`
      explanation += `• Target: ${calorie_target} calories/day\n`
      explanation += `• This creates a ${Math.abs(calorie_deficit)} calorie deficit vs TDEE\n`
      explanation += `• Expected weight loss: ~${weeklyChange.toFixed(2)} kg/week\n\n`
    } else {
      explanation += `To reach your target weight of ${targetWeight.toFixed(1)} kg in ${timeframeMonths} month${timeframeMonths > 1 ? 's' : ''}:\n`
      explanation += `• Target: ${calorie_target} calories/day\n`
      explanation += `• This creates a ${calorie_deficit} calorie surplus vs TDEE\n`
      explanation += `• Expected weight gain: ~${weeklyChange.toFixed(2)} kg/week\n\n`
    }
    
    explanation += `⚠️ Important: TDEE is an estimate. Your actual daily burn may vary by ±200-400 calories based on:\n`
    explanation += `• Muscle mass (more muscle = higher metabolism)\n`
    explanation += `• Genetics and individual metabolism\n`
    explanation += `• NEAT (Non-Exercise Activity Thermogenesis - fidgeting, posture, etc.)\n`
    explanation += `• Daily activity variations\n\n`
    explanation += `💡 Tip: Track your weight weekly and adjust calories if needed. If you're not seeing expected progress after 2-3 weeks, adjust by ±200-300 calories.\n\n`
  } else if (hasWeightLoss && hasMuscleGain) {
    explanation += `How we calculate your daily burn (TDEE):\n`
    explanation += `• BMR: ${bmr.toFixed(0)} cal/day (based on weight, height, age, gender)\n`
    explanation += `• Activity Level: ${activityLevel.replace('_', ' ')} (${activityLevel === 'sedentary' ? '1.2x' : activityLevel === 'light' ? '1.375x' : activityLevel === 'moderate' ? '1.55x' : activityLevel === 'active' ? '1.725x' : '1.9x'} multiplier)\n`
    explanation += `• TDEE: ${tdee} cal/day (estimated daily burn)\n\n`
    explanation += `For body recomposition (losing fat while building muscle), aim for ${calorie_target} calories/day.\n`
    if (calorie_deficit < 0) {
      explanation += `This creates a ${Math.abs(calorie_deficit)} calorie deficit vs TDEE with high protein to preserve muscle.\n`
    } else {
      explanation += `This creates a ${calorie_deficit} calorie surplus vs TDEE (your body burns ${tdee} cal/day).\n`
    }
    explanation += `⚠️ Note: TDEE is an estimate. Actual burn varies by ±200-400 cal based on individual factors.\n\n`
  } else if (hasWeightLoss) {
    explanation += `How we calculate your daily burn (TDEE):\n`
    explanation += `• BMR: ${bmr.toFixed(0)} cal/day (based on weight, height, age, gender)\n`
    explanation += `• Activity Level: ${activityLevel.replace('_', ' ')} (${activityLevel === 'sedentary' ? '1.2x' : activityLevel === 'light' ? '1.375x' : activityLevel === 'moderate' ? '1.55x' : activityLevel === 'active' ? '1.725x' : '1.9x'} multiplier)\n`
    explanation += `• TDEE: ${tdee} cal/day (estimated daily burn)\n\n`
    explanation += `To lose weight safely, aim for ${calorie_target} calories/day.\n`
    if (calorie_deficit < 0) {
      explanation += `This creates a ${Math.abs(calorie_deficit)} calorie deficit vs TDEE (your body burns ${tdee} cal/day).\n`
    } else {
      explanation += `⚠️ Warning: This is ${calorie_deficit} calories ABOVE TDEE. For weight loss, you typically need a deficit. Consider adjusting your activity level or target.\n`
    }
    explanation += `⚠️ Note: TDEE is an estimate. Actual burn varies by ±200-400 cal based on muscle mass, genetics, and daily activity.\n\n`
  } else if (hasMuscleGain) {
    explanation += `How we calculate your daily burn (TDEE):\n`
    explanation += `• BMR: ${bmr.toFixed(0)} cal/day (based on weight, height, age, gender)\n`
    explanation += `• Activity Level: ${activityLevel.replace('_', ' ')} (${activityLevel === 'sedentary' ? '1.2x' : activityLevel === 'light' ? '1.375x' : activityLevel === 'moderate' ? '1.55x' : activityLevel === 'active' ? '1.725x' : '1.9x'} multiplier)\n`
    explanation += `• TDEE: ${tdee} cal/day (estimated daily burn)\n\n`
    explanation += `To build muscle, aim for ${calorie_target} calories/day.\n`
    if (calorie_deficit > 0) {
      explanation += `This creates a ${calorie_deficit} calorie surplus vs TDEE (your body burns ${tdee} cal/day).\n`
    } else {
      explanation += `This is ${Math.abs(calorie_deficit)} calories below TDEE (your body burns ${tdee} cal/day).\n`
    }
    explanation += `⚠️ Note: TDEE is an estimate. Actual burn varies by ±200-400 cal based on muscle mass, genetics, and daily activity.\n\n`
  } else if (hasWeightGain) {
    explanation += `How we calculate your daily burn (TDEE):\n`
    explanation += `• BMR: ${bmr.toFixed(0)} cal/day (based on weight, height, age, gender)\n`
    explanation += `• Activity Level: ${activityLevel.replace('_', ' ')} (${activityLevel === 'sedentary' ? '1.2x' : activityLevel === 'light' ? '1.375x' : activityLevel === 'moderate' ? '1.55x' : activityLevel === 'active' ? '1.725x' : '1.9x'} multiplier)\n`
    explanation += `• TDEE: ${tdee} cal/day (estimated daily burn)\n\n`
    explanation += `To gain weight, aim for ${calorie_target} calories/day.\n`
    if (calorie_deficit > 0) {
      explanation += `This creates a ${calorie_deficit} calorie surplus vs TDEE (your body burns ${tdee} cal/day).\n`
    } else {
      explanation += `This is ${Math.abs(calorie_deficit)} calories below TDEE (your body burns ${tdee} cal/day).\n`
    }
    explanation += `⚠️ Note: TDEE is an estimate. Actual burn varies by ±200-400 cal based on individual factors.\n\n`
  } else if (hasRecomp) {
    explanation += `How we calculate your daily burn (TDEE):\n`
    explanation += `• BMR: ${bmr.toFixed(0)} cal/day (based on weight, height, age, gender)\n`
    explanation += `• Activity Level: ${activityLevel.replace('_', ' ')} (${activityLevel === 'sedentary' ? '1.2x' : activityLevel === 'light' ? '1.375x' : activityLevel === 'moderate' ? '1.55x' : activityLevel === 'active' ? '1.725x' : '1.9x'} multiplier)\n`
    explanation += `• TDEE: ${tdee} cal/day (estimated daily burn)\n\n`
    explanation += `For body recomposition, aim for ${calorie_target} calories/day.\n`
    explanation += `⚠️ Note: TDEE is an estimate. Track your progress and adjust as needed.\n\n`
  } else {
    explanation += `How we calculate your daily burn (TDEE):\n`
    explanation += `• BMR: ${bmr.toFixed(0)} cal/day (based on weight, height, age, gender)\n`
    explanation += `• Activity Level: ${activityLevel.replace('_', ' ')} (${activityLevel === 'sedentary' ? '1.2x' : activityLevel === 'light' ? '1.375x' : activityLevel === 'moderate' ? '1.55x' : activityLevel === 'active' ? '1.725x' : '1.9x'} multiplier)\n`
    explanation += `• TDEE: ${tdee} cal/day (estimated daily burn)\n\n`
    explanation += `To maintain your current weight, aim for ${calorie_target} calories/day.\n`
    explanation += `⚠️ Note: TDEE is an estimate. Your actual burn may vary by ±200-400 calories.\n\n`
  }
  
  explanation += `Your Daily Targets:\n`
  explanation += `• Calories: ${calorie_target} cal/day\n`
  explanation += `• Protein: ${protein_target}g/day\n`
  explanation += `• Water: ${water_goal}ml/day`

  return {
    calorie_target,
    protein_target,
    water_goal,
    bmr,
    tdee,
    calorie_deficit,
    explanation,
  }
}

/**
 * Estimate gender from name (simple heuristic - can be improved)
 * Returns true for male, false for female
 */
export function estimateGenderFromName(name: string): boolean | null {
  // This is a simple heuristic - in production, you might want to ask the user
  // or use a more sophisticated approach
  const commonMaleNames = ['john', 'mike', 'david', 'james', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles']
  const commonFemaleNames = ['mary', 'jennifer', 'linda', 'patricia', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen']
  
  const lowerName = name.toLowerCase().split(' ')[0] // First name only
  
  if (commonMaleNames.includes(lowerName)) return true
  if (commonFemaleNames.includes(lowerName)) return false
  
  return null // Unknown - default to male for BMR calculation
}

