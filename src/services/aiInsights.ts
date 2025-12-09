import { openai } from '@/lib/openai'
import { DailyLog } from '@/types'
import { UserProfile } from '@/types'

export async function generateDailyInsights(
  dailyLog: DailyLog,
  profile: UserProfile | null
): Promise<string> {
  if (!openai) {
    return 'AI insights are not available. Please configure your OpenAI API key.'
  }

  try {
    const profileContext = profile
      ? `User goals: ${profile.goal}, Activity level: ${profile.activity_level}, Dietary preference: ${profile.dietary_preference}. Target calories: ${profile.calorie_target || 2000}, Target protein: ${profile.protein_target || 150}g.`
      : 'No user profile available.'

    const mealsSummary = dailyLog.meals.length > 0
      ? `Meals logged: ${dailyLog.meals.length}. Total calories: ${dailyLog.calories_consumed}, Protein: ${dailyLog.protein}g, Carbs: ${dailyLog.carbs || 0}g, Fats: ${dailyLog.fats || 0}g.`
      : 'No meals logged today.'

    const workoutsSummary = dailyLog.exercises.length > 0
      ? `Workouts: ${dailyLog.exercises.length}, Calories burned: ${dailyLog.calories_burned}.`
      : 'No workouts logged today.'

    const waterSummary = dailyLog.water_intake > 0
      ? `Water intake: ${dailyLog.water_intake}ml.`
      : 'No water logged today.'

    const netCalories = dailyLog.net_calories
    const calorieStatus = netCalories > 0 ? 'surplus' : netCalories < 0 ? 'deficit' : 'balanced'

    const prompt = `You are a nutrition and fitness AI coach. Analyze this daily summary and provide a brief, encouraging, and actionable insight (2-3 sentences max). Be specific and helpful.

${profileContext}

Daily Summary:
- ${mealsSummary}
- ${workoutsSummary}
- ${waterSummary}
- Net calories: ${netCalories} (${calorieStatus})

Provide a personalized insight focusing on:
1. What went well today
2. One specific actionable tip for improvement
3. Keep it encouraging and motivating

Be concise and practical.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful nutrition and fitness coach. Provide brief, encouraging, and actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    return completion.choices[0]?.message?.content || 'Unable to generate insights at this time.'
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return 'Unable to generate insights. Please try again later.'
  }
}

