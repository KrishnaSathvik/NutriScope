import { UserProfile, DailyLog } from '@/types'

export interface ContextOptions {
  mode?: 'chat' | 'insight'
  includeGuidance?: boolean
  includePersonalizedInsights?: boolean
}

/**
 * Build personalized context from user profile and daily log
 * Shared helper used by both chat and insights
 */
export function buildPersonalizedContext(
  profile: UserProfile | null,
  dailyLog: DailyLog | null,
  options: ContextOptions = {}
): string {
  const { mode = 'chat', includeGuidance = true, includePersonalizedInsights = true } = options
  let context = ''
  
  if (profile) {
    // Personalized greeting with name if available
    const userName = profile.name ? `${profile.name}` : 'you'
    
    // Personal details
    if (profile.age || profile.weight || profile.height) {
      context += `**About ${userName}:**\n`
      if (profile.name) context += `- Name: ${profile.name}\n`
      if (profile.age) context += `- Age: ${profile.age} years\n`
      if (profile.weight) context += `- Weight: ${profile.weight}kg\n`
      if (profile.height) context += `- Height: ${profile.height}cm\n`
      context += `\n`
    }
    
    // Goals and preferences with detailed descriptions
    const goalDescriptions: Record<string, string> = {
      lose_weight: 'losing weight',
      gain_muscle: 'gaining muscle mass',
      maintain: 'maintaining your current weight',
      improve_fitness: 'improving overall fitness',
    }
    
    const activityDescriptions: Record<string, string> = {
      sedentary: 'sedentary lifestyle (little to no exercise)',
      light: 'light activity (1-3 days/week)',
      moderate: 'moderate activity (3-5 days/week)',
      active: 'active lifestyle (6-7 days/week)',
      very_active: 'very active lifestyle (intense daily exercise)',
    }
    
    const dietaryDescriptions: Record<string, string> = {
      vegetarian: 'vegetarian diet',
      vegan: 'vegan diet',
      non_vegetarian: 'non-vegetarian diet',
      flexitarian: 'flexitarian diet (mostly plant-based)',
    }
    
    context += `**Goals & Preferences:**\n`
    context += `- Primary Goal: ${goalDescriptions[profile.goal] || profile.goal}\n`
    context += `- Activity Level: ${activityDescriptions[profile.activity_level] || profile.activity_level}\n`
    context += `- Dietary Preference: ${dietaryDescriptions[profile.dietary_preference] || profile.dietary_preference}\n`
    
    if (profile.restrictions && profile.restrictions.length > 0) {
      context += `- Dietary Restrictions: ${profile.restrictions.join(', ')}\n`
    }
    
    context += `\n**Personalized Targets:**\n`
    context += `- Calorie Target: ${profile.calorie_target || 2000} cal/day\n`
    context += `- Protein Target: ${profile.protein_target || 150}g/day\n`
    if ('target_carbs' in profile && profile.target_carbs) context += `- Carb Target: ${profile.target_carbs}g/day\n`
    if ('target_fats' in profile && profile.target_fats) context += `- Fat Target: ${profile.target_fats}g/day\n`
    context += `- Water Goal: ${profile.water_goal || 2000}ml/day\n`
    context += `\n`
    
    // Personalized guidance (only for chat mode or when explicitly requested)
    if (includeGuidance && mode === 'chat') {
      context += `**Personalized Guidance:**\n`
      if (profile.goal === 'lose_weight') {
        context += `- Focus on calorie deficit while maintaining protein intake to preserve muscle\n`
        context += `- Aim for ${profile.protein_target || 150}g+ protein daily to support weight loss\n`
        context += `- Stay hydrated - your water goal is ${profile.water_goal || 2000}ml/day\n`
      } else if (profile.goal === 'gain_muscle') {
        context += `- Focus on protein-rich meals to support muscle growth\n`
        context += `- Ensure adequate calories (${profile.calorie_target || 2000} cal/day) for muscle building\n`
        context += `- Prioritize strength training and recovery\n`
      } else if (profile.goal === 'maintain') {
        context += `- Balance your intake around ${profile.calorie_target || 2000} calories daily\n`
        context += `- Maintain ${profile.protein_target || 150}g protein for muscle maintenance\n`
      } else if (profile.goal === 'improve_fitness') {
        context += `- Focus on balanced nutrition and regular exercise\n`
        context += `- Support your active lifestyle with ${profile.protein_target || 150}g+ protein\n`
      }
      context += `\n`
    }
  }

  if (dailyLog) {
    const calorieProgress = profile?.calorie_target 
      ? ((dailyLog.calories_consumed / profile.calorie_target) * 100).toFixed(0) 
      : '0'
    const proteinProgress = profile?.protein_target 
      ? ((dailyLog.protein / profile.protein_target) * 100).toFixed(0) 
      : '0'
    const waterProgress = profile?.water_goal 
      ? ((dailyLog.water_intake / profile.water_goal) * 100).toFixed(0) 
      : '0'
    
    context += `**Today's Progress:**\n`
    context += `- Calories: ${dailyLog.calories_consumed} / ${profile?.calorie_target || 2000} cal (${calorieProgress}%)\n`
    context += `- Protein: ${dailyLog.protein}g / ${profile?.protein_target || 150}g (${proteinProgress}%)\n`
    context += `- Water: ${dailyLog.water_intake}ml / ${profile?.water_goal || 2000}ml (${waterProgress}%)\n`
    context += `- Calories Burned: ${dailyLog.calories_burned} cal\n`
    context += `- Net Calories: ${dailyLog.net_calories} cal\n`
    context += `- Meals Logged: ${dailyLog.meals.length}\n`
    context += `- Workouts Logged: ${dailyLog.exercises.length}\n`
    
    if (dailyLog.meals.length > 0) {
      const mealLimit = mode === 'chat' ? 3 : 5
      context += `\n**Recent Meals:**\n`
      dailyLog.meals.slice(0, mealLimit).forEach((m, i) => {
        context += `${i + 1}. ${m.meal_type || 'meal'}: ${m.calories} cal, ${m.protein}g protein`
        if (m.name) context += ` (${m.name})`
        context += `\n`
      })
    }
    
    if (dailyLog.exercises.length > 0) {
      const exerciseLimit = mode === 'chat' ? 3 : 5
      context += `\n**Recent Workouts:**\n`
      dailyLog.exercises.slice(0, exerciseLimit).forEach((e, i) => {
        const exerciseNames = e.exercises?.map(ex => ex.name).join(', ') || 'Exercise'
        context += `${i + 1}. ${exerciseNames}: ${e.duration || 0} min`
        if (e.calories_burned) context += `, ${e.calories_burned} cal burned`
        context += `\n`
      })
    }
    
    // Personalized insights (only for chat mode or when explicitly requested)
    if (includePersonalizedInsights && mode === 'chat' && profile) {
      context += `\n**Personalized Insights:**\n`
      if (dailyLog.calories_consumed < (profile.calorie_target || 2000) * 0.8) {
        context += `- You're below your calorie target - consider adding nutrient-dense meals\n`
      } else if (dailyLog.calories_consumed > (profile.calorie_target || 2000) * 1.2) {
        context += `- You're above your calorie target - focus on portion control\n`
      }
      
      if (dailyLog.protein < (profile.protein_target || 150) * 0.8) {
        context += `- Protein intake is below target - add protein-rich foods to your meals\n`
      }
      
      if (dailyLog.water_intake < (profile.water_goal || 2000) * 0.7) {
        context += `- Water intake is low - remember to stay hydrated throughout the day\n`
      }
      context += `\n`
    }
  }

  return context
}

