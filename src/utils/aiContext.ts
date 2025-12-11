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
    if (profile.age || profile.weight || profile.height || profile.gender) {
      context += `**About ${userName}:**\n`
      if (profile.name) context += `- Name: ${profile.name}\n`
      if (profile.gender) context += `- Sex: ${profile.gender}\n`
      if (profile.age) context += `- Age: ${profile.age} years\n`
      if (profile.weight) context += `- Weight: ${profile.weight}kg\n`
      if (profile.height) context += `- Height: ${profile.height}cm\n`
      context += `\n`
    }
    
    // Goals and preferences with detailed descriptions
    const goalDescriptions: Record<string, string> = {
      lose_weight: 'losing weight',
      gain_muscle: 'gaining muscle mass',
      gain_weight: 'gaining weight',
      maintain: 'maintaining your current weight',
      improve_fitness: 'improving overall fitness',
      build_endurance: 'building endurance',
      improve_health: 'improving overall health',
      body_recomposition: 'body recomposition (losing fat while gaining muscle)',
      increase_energy: 'increasing energy levels',
      reduce_body_fat: 'reducing body fat percentage',
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
    
    // Handle multiple goals (new) or single goal (backward compatibility)
    const userGoals = profile.goals && profile.goals.length > 0 
      ? profile.goals 
      : (profile.goal ? [profile.goal] : ['maintain'])
    
    const goalLabels = userGoals.map(g => goalDescriptions[g] || g).join(', ')
    
    context += `**Goals & Preferences:**\n`
    if (userGoals.length > 1) {
      context += `- Goals: ${goalLabels}\n`
      context += `- Primary Goal (for backward compatibility): ${goalDescriptions[profile.goal] || profile.goal}\n`
    } else {
      context += `- Primary Goal: ${goalLabels}\n`
    }
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
      
      // Handle multiple goals
      const hasWeightLoss = userGoals.includes('lose_weight') || userGoals.includes('reduce_body_fat')
      const hasMuscleGain = userGoals.includes('gain_muscle')
      const hasWeightGain = userGoals.includes('gain_weight')
      const hasRecomp = userGoals.includes('body_recomposition') || userGoals.includes('improve_fitness')
      const hasEndurance = userGoals.includes('build_endurance')
      const hasEnergy = userGoals.includes('increase_energy')
      const hasHealth = userGoals.includes('improve_health')
      const hasMaintain = userGoals.includes('maintain')
      
      if (hasWeightLoss && hasMuscleGain) {
        context += `- Body recomposition focus: slight calorie deficit with high protein to lose fat while building muscle\n`
        context += `- Aim for ${profile.protein_target || 150}g+ protein daily to preserve muscle during fat loss\n`
        context += `- Prioritize strength training with adequate recovery\n`
      } else if (hasWeightLoss) {
        context += `- Focus on calorie deficit while maintaining protein intake to preserve muscle\n`
        context += `- Aim for ${profile.protein_target || 150}g+ protein daily to support weight loss\n`
        context += `- Stay hydrated - your water goal is ${profile.water_goal || 2000}ml/day\n`
      } else if (hasMuscleGain) {
        context += `- Focus on protein-rich meals to support muscle growth\n`
        context += `- Ensure adequate calories (${profile.calorie_target || 2000} cal/day) for muscle building\n`
        context += `- Prioritize strength training and recovery\n`
      } else if (hasWeightGain) {
        context += `- Focus on calorie surplus with balanced nutrition\n`
        context += `- Aim for ${profile.protein_target || 150}g+ protein to support healthy weight gain\n`
        context += `- Include strength training to build muscle mass\n`
      } else if (hasRecomp) {
        context += `- Body recomposition: slight deficit with high protein for fat loss and muscle gain\n`
        context += `- Prioritize ${profile.protein_target || 150}g+ protein daily\n`
        context += `- Combine strength training with moderate cardio\n`
      } else if (hasEndurance) {
        context += `- Focus on balanced nutrition to support endurance training\n`
        context += `- Ensure adequate carbs for energy and ${profile.protein_target || 150}g+ protein for recovery\n`
        context += `- Stay well-hydrated - your water goal is ${profile.water_goal || 2000}ml/day\n`
      } else if (hasEnergy) {
        context += `- Focus on balanced meals with adequate protein and complex carbs\n`
        context += `- Ensure regular meal timing to maintain energy levels\n`
        context += `- Stay hydrated - your water goal is ${profile.water_goal || 2000}ml/day\n`
      } else if (hasHealth) {
        context += `- Focus on balanced, nutrient-dense meals\n`
        context += `- Maintain ${profile.protein_target || 150}g protein for overall health\n`
        context += `- Include variety of fruits, vegetables, and whole grains\n`
      } else if (hasMaintain) {
        context += `- Balance your intake around ${profile.calorie_target || 2000} calories daily\n`
        context += `- Maintain ${profile.protein_target || 150}g protein for muscle maintenance\n`
      } else {
        context += `- Focus on balanced nutrition aligned with your goals\n`
        context += `- Aim for ${profile.protein_target || 150}g+ protein daily\n`
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

