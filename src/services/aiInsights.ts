import { openai } from '@/lib/openai'
import { DailyLog } from '@/types'
import { UserProfile } from '@/types'

/**
 * Build comprehensive personalized context from user profile and daily log
 */
function buildPersonalizedContext(profile: UserProfile | null, dailyLog: DailyLog): string {
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
      maintain: 'maintaining current weight',
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
  }

  // Today's progress with percentages
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
    context += `\n**Meals Today:**\n`
    dailyLog.meals.slice(0, 5).forEach((m, i) => {
      context += `${i + 1}. ${m.meal_type || 'meal'}: ${m.calories} cal, ${m.protein}g protein`
      if (m.name) context += ` (${m.name})`
      context += `\n`
    })
  }
  
  if (dailyLog.exercises.length > 0) {
    context += `\n**Workouts Today:**\n`
    dailyLog.exercises.slice(0, 5).forEach((e, i) => {
      const exerciseNames = e.exercises?.map(ex => ex.name).join(', ') || 'Exercise'
      context += `${i + 1}. ${exerciseNames}: ${e.duration || 0} min`
      if (e.calories_burned) context += `, ${e.calories_burned} cal burned`
      context += `\n`
    })
  }
  
  return context
}

export async function generateDailyInsights(
  dailyLog: DailyLog,
  profile: UserProfile | null
): Promise<string> {
  if (!openai) {
    return 'AI insights are not available. Please configure your OpenAI API key.'
  }

  try {
    // Build comprehensive personalized context
    const personalizedContext = buildPersonalizedContext(profile, dailyLog)
    
    const userName = profile?.name || 'you'
    const goalDescription = profile?.goal === 'lose_weight' ? 'losing weight' 
      : profile?.goal === 'gain_muscle' ? 'gaining muscle'
      : profile?.goal === 'maintain' ? 'maintaining your weight'
      : profile?.goal === 'improve_fitness' ? 'improving fitness'
      : 'your goals'
    
    // Calculate progress percentages for use in prompt
    const calorieProgress = profile?.calorie_target 
      ? ((dailyLog.calories_consumed / profile.calorie_target) * 100).toFixed(0) 
      : '0'
    const proteinProgress = profile?.protein_target 
      ? ((dailyLog.protein / profile.protein_target) * 100).toFixed(0) 
      : '0'

    const prompt = `You are a personalized AI nutrition and fitness coach for ${userName}. You understand ${userName}'s unique profile, goals, and daily progress. Provide a brief, encouraging, and highly personalized insight (2-3 sentences max).

${personalizedContext}

**IMPORTANT - Personalization Guidelines:**
1. **Use ${userName}'s name** when addressing them (if available)
2. **Reference their specific goal** (${goalDescription}) and how today's progress aligns with it
3. **Consider their dietary preference** (${profile?.dietary_preference || 'flexitarian'}) when making suggestions - suggest foods that fit their diet
4. **Reference their activity level** (${profile?.activity_level || 'moderate'}) when relevant
5. **Compare their progress to their personalized targets** - they're at ${calorieProgress}% of calories (${dailyLog.calories_consumed}/${profile?.calorie_target || 2000} cal) and ${proteinProgress}% of protein (${dailyLog.protein}/${profile?.protein_target || 150}g)
6. **Be specific** - mention exact numbers and percentages from their progress
7. **Give actionable advice** tailored to their situation, not generic tips
8. **Be encouraging** and reference what they did well today
9. **Reference their restrictions** if they have any: ${profile?.restrictions?.join(', ') || 'none'}

**Example Personalized Response:**
Instead of: "Great job on recognizing a day of balance with net calories at zero! To enhance your progress, aim to log at least one meal tomorrow that includes a good source of protein, like beans or tofu, to help reach your target."

Say: "${userName}, ${dailyLog.calories_consumed === 0 ? 'you haven\'t logged any meals yet today' : `you're at ${dailyLog.calories_consumed} calories (${calorieProgress}% of your ${profile?.calorie_target || 2000} cal target)`}. ${dailyLog.protein < (profile?.protein_target || 150) * 0.5 ? `Since your goal is ${goalDescription} and you need ${profile?.protein_target || 150}g protein daily, let's add some ${profile?.dietary_preference === 'vegetarian' ? 'legumes, tofu, or dairy' : profile?.dietary_preference === 'vegan' ? 'plant-based protein like beans or lentils' : 'lean protein'} to help you reach your ${profile?.protein_target || 150}g target!` : 'Great work on your protein intake!'}"

Provide your personalized insight now:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a personalized AI nutrition and fitness coach. You provide brief, encouraging, and highly personalized insights based on each user's unique profile, goals, and daily progress. Always use the user's name, reference their specific targets, and give actionable advice tailored to their situation.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content || 'Unable to generate insights at this time.'
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return 'Unable to generate insights. Please try again later.'
  }
}

