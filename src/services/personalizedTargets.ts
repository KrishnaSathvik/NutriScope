import { UserGoal, ActivityLevel, DietaryPreference } from '@/types'

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
 * Calculate target calories based on goal
 */
function calculateTargetCalories(tdee: number, goal: UserGoal): number {
  const goalAdjustments: Record<UserGoal, number> = {
    lose_weight: -500,        // 500 cal deficit for ~1lb/week loss
    maintain: 0,              // Maintain current weight
    gain_muscle: 300,         // 300 cal surplus for muscle gain
    improve_fitness: -200,    // Slight deficit for body recomposition
  }
  
  return Math.round(tdee + goalAdjustments[goal])
}

/**
 * Calculate target protein based on goal and weight
 */
function calculateTargetProtein(weight: number, goal: UserGoal, activityLevel: ActivityLevel): number {
  // Protein recommendations per kg of bodyweight
  const proteinMultipliers: Record<UserGoal, number> = {
    lose_weight: 2.2,         // Higher protein for weight loss (preserves muscle)
    maintain: 1.6,             // Standard maintenance
    gain_muscle: 2.0,          // Higher protein for muscle building
    improve_fitness: 1.8,       // Moderate-high for fitness improvement
  }
  
  // Adjust for activity level
  const activityMultiplier = activityLevel === 'very_active' || activityLevel === 'active' ? 1.1 : 1.0
  
  const proteinPerKg = proteinMultipliers[goal] * activityMultiplier
  return Math.round(weight * proteinPerKg)
}

/**
 * Calculate water goal based on weight, activity level, and goal
 */
function calculateWaterGoal(weight: number, activityLevel: ActivityLevel, goal: UserGoal): number {
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
  
  // Adjust for goal (weight loss needs more hydration)
  if (goal === 'lose_weight') {
    baseWater += 300
  }
  
  // Round to nearest 100ml
  return Math.round(baseWater / 100) * 100
}

/**
 * Calculate personalized nutrition targets based on user profile
 */
export function calculatePersonalizedTargets(params: {
  weight: number
  height: number
  age: number
  goal: UserGoal
  activityLevel: ActivityLevel
  dietaryPreference?: DietaryPreference
  isMale?: boolean
}): {
  calorie_target: number
  protein_target: number
  water_goal: number
  bmr: number
  tdee: number
  calorie_deficit: number // Negative for deficit, positive for surplus
  explanation: string
} {
  const { weight, height, age, goal, activityLevel, isMale = true } = params

  // Calculate BMR
  const bmr = calculateBMR(weight, height, age, isMale)
  
  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel)
  
  // Calculate target calories
  const calorie_target = calculateTargetCalories(tdee, goal)
  
  // Calculate calorie deficit/surplus (negative = deficit, positive = surplus)
  const calorie_deficit = calorie_target - tdee
  
  // Calculate target protein
  const protein_target = calculateTargetProtein(weight, goal, activityLevel)
  
  // Calculate water goal
  const water_goal = calculateWaterGoal(weight, activityLevel, goal)

  // Generate personalized explanation
  const goalNames: Record<UserGoal, string> = {
    lose_weight: 'losing weight',
    maintain: 'maintaining your weight',
    gain_muscle: 'gaining muscle',
    improve_fitness: 'improving fitness',
  }
  
  const activityNames: Record<ActivityLevel, string> = {
    sedentary: 'sedentary',
    light: 'light activity',
    moderate: 'moderate activity',
    active: 'active',
    very_active: 'very active',
  }

  let explanation = `Based on your profile:\n`
  explanation += `• Goal: ${goalNames[goal]}\n`
  explanation += `• Activity: ${activityNames[activityLevel]}\n`
  explanation += `• Weight: ${weight}kg, Height: ${height}cm, Age: ${age}\n\n`
  explanation += `Your daily energy:\n`
  explanation += `• BMR (Base): ${bmr} cal/day\n`
  explanation += `• TDEE (Total Burn): ${tdee} cal/day\n`
  explanation += `• Target Intake: ${calorie_target} cal/day\n`
  if (calorie_deficit < 0) {
    explanation += `• Deficit: ${Math.abs(calorie_deficit)} cal/day (burn ${Math.abs(calorie_deficit)} more than you eat)\n`
  } else if (calorie_deficit > 0) {
    explanation += `• Surplus: ${calorie_deficit} cal/day (eat ${calorie_deficit} more than you burn)\n`
  } else {
    explanation += `• Balanced: Maintain current weight\n`
  }
  explanation += `\nYour personalized targets:\n`
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

