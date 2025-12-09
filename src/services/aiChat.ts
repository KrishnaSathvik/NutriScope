import { ChatMessage, AIAction, UserProfile, DailyLog } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Backend proxy for OpenAI API calls
 * Calls our secure backend API endpoint instead of OpenAI directly
 */
export async function chatWithAI(
  messages: ChatMessage[],
  profile: UserProfile | null,
  dailyLog: DailyLog | null,
  imageUrl?: string,
  userId?: string
): Promise<{ message: string; action?: AIAction }> {
  // Use backend API proxy if available, otherwise fall back to direct OpenAI (dev only)
  const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false'
  
  if (useBackendProxy) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/chat'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'x-user-id': userId }),
        },
        body: JSON.stringify({
          messages,
          profile: profile ? {
            calorie_target: profile.calorie_target,
            protein_target: profile.protein_target,
            goal: profile.goal,
          } : undefined,
          dailyLog: dailyLog ? {
            calories_consumed: dailyLog.calories_consumed,
            protein: dailyLog.protein,
            calories_burned: dailyLog.calories_burned,
          } : undefined,
          imageUrl,
          userId,
        }),
      })

      if (!response.ok) {
        if (response.status === 429) {
          const error = await response.json()
          throw new Error(error.message || 'Rate limit exceeded. Please try again later.')
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to get AI response')
      }

      const data = await response.json()
      return {
        message: data.message,
        action: data.action,
      }
    } catch (error) {
      // In production, always use backend proxy - no fallback
      if (import.meta.env.PROD) {
        logger.error('Backend proxy failed in production:', error)
        throw new Error('AI service unavailable. Please try again later.')
      }
      // Fall back to direct OpenAI only in development
      logger.warn('Backend proxy failed, falling back to direct OpenAI:', error)
      return chatWithAIDirect(messages, profile, dailyLog, imageUrl)
    }
  }

  // Direct OpenAI call (dev only - should not reach here in production)
  if (import.meta.env.PROD) {
    throw new Error('Backend proxy is required in production. Please set VITE_USE_BACKEND_PROXY=true')
  }
  return chatWithAIDirect(messages, profile, dailyLog, imageUrl)
}

/**
 * Direct OpenAI API call (dev/fallback only)
 * @deprecated Use backend proxy in production
 */
async function chatWithAIDirect(
  messages: ChatMessage[],
  profile: UserProfile | null,
  dailyLog: DailyLog | null,
  imageUrl?: string
): Promise<{ message: string; action?: AIAction }> {
  const { openai } = await import('@/lib/openai')
  
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  // Build enhanced context
  const context = buildContext(profile, dailyLog)
  
  // Add image analysis if image provided
  let imageContent: any[] = []
  if (imageUrl) {
    imageContent = [
      {
        type: 'image_url',
        image_url: { url: imageUrl },
      },
    ]
  }

  // Prepare messages with system prompt
  const systemMessage = {
    role: 'system' as const,
    content: `You are a helpful AI health and fitness assistant for NutriScope. ${context}

You can help users:
1. Log meals by understanding their descriptions (e.g., "I had chicken salad for lunch")
2. Log workouts (e.g., "I ran for 30 minutes")
3. Log water intake (e.g., "I drank 500ml of water")
4. Answer nutrition and fitness questions
5. Provide personalized insights based on their data

When the user wants to log something, respond with a JSON action in this format:
{
  "action": {
    "type": "log_meal" | "log_workout" | "log_water" | "get_summary" | "none",
    "data": { ... }
  },
  "message": "Your response message"
}

For meals, include: meal_type, calories, protein, carbs (optional), fats (optional)
For workouts, include: exercise_name, exercise_type, duration, calories_burned
For water, include: water_amount (in ml)

Be conversational and helpful. Only include actions when the user explicitly wants to log something.`,
  }

  // Prepare user messages
  const formattedMessages = messages.map((msg) => {
    if (msg.role === 'user' && msg.image_url && imageContent.length > 0) {
      return {
        role: msg.role,
        content: [
          { type: 'text', text: msg.content || '' },
          ...imageContent,
        ],
      }
    }
    return {
      role: msg.role,
      content: msg.content,
    }
  })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      systemMessage,
      ...formattedMessages,
    ],
    response_format: { type: 'json_object' }, // Force JSON response for action parsing
  })

  const responseContent = completion.choices[0]?.message?.content || 'Sorry, I encountered an error.'
  
  // Try to parse JSON response
  let action: AIAction | undefined
  let message = responseContent
  
  try {
    const parsed = JSON.parse(responseContent)
    if (parsed.action && parsed.action.type !== 'none') {
      action = parsed.action
      message = parsed.message || 'Done!'
    } else {
      message = parsed.message || parsed.content || responseContent
    }
  } catch (e) {
    // If not JSON, try to extract action from text
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*"action"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.action && parsed.action.type !== 'none') {
          action = parsed.action
          message = parsed.message || responseContent.replace(jsonMatch[0], '').trim() || responseContent
        }
      }
    } catch (e2) {
      // If parsing fails, just return the message
      message = responseContent
    }
  }

  return { message, action }
}

/**
 * Build enhanced context from user profile and daily log
 */
function buildContext(profile: UserProfile | null, dailyLog: DailyLog | null): string {
  let context = ''
  
  if (profile) {
    context += `User Profile:
- Goal: ${profile.goal}
- Activity Level: ${profile.activity_level}
- Dietary Preference: ${profile.dietary_preference}
- Calorie Target: ${profile.calorie_target || 2000} cal
- Protein Target: ${profile.protein_target || 150}g
- Water Goal: ${profile.water_goal || 2000}ml
`
  }

  if (dailyLog) {
    context += `
Today's Progress:
- Calories Consumed: ${dailyLog.calories_consumed} / ${profile?.calorie_target || 2000}
- Protein: ${dailyLog.protein}g / ${profile?.protein_target || 150}g
- Water Intake: ${dailyLog.water_intake}ml / ${profile?.water_goal || 2000}ml
- Calories Burned: ${dailyLog.calories_burned} cal
- Meals Logged: ${dailyLog.meals.length}
- Workouts Logged: ${dailyLog.exercises.length}

Recent Meals: ${dailyLog.meals.slice(0, 3).map(m => 
  `${m.meal_type || 'meal'}: ${m.calories} cal, ${m.protein}g protein`
).join(', ') || 'None'}
`
  }

  return context
}

/**
 * Execute AI action (log meal, workout, water)
 */
export async function executeAction(
  action: AIAction,
  userId: string,
  date: string
): Promise<{ success: boolean; message: string }> {
  try {
    switch (action.type) {
      case 'log_meal':
        if (!action.data) {
          return { success: false, message: 'Missing meal data' }
        }
        const { createMeal } = await import('./meals')
        await createMeal({
          date,
          meal_type: action.data.meal_type || 'lunch',
          calories: action.data.calories || 0,
          protein: action.data.protein || 0,
          carbs: action.data.carbs,
          fats: action.data.fats,
          food_items: [],
        })
        return { success: true, message: 'Meal logged successfully!' }

      case 'log_workout':
        if (!action.data) {
          return { success: false, message: 'Missing workout data' }
        }
        const { createExercise } = await import('./workouts')
        await createExercise({
          date,
          exercises: [{
            name: action.data.exercise_name || 'Workout',
            type: (action.data.exercise_type as any) || 'other',
            duration: action.data.duration,
            calories_burned: action.data.calories_burned,
          }],
          calories_burned: action.data.calories_burned || 0,
          duration: action.data.duration,
        })
        return { success: true, message: 'Workout logged successfully!' }

      case 'log_water':
        if (!action.data?.water_amount) {
          return { success: false, message: 'Missing water amount' }
        }
        const { addWaterIntake } = await import('./water')
        await addWaterIntake(userId, date, action.data.water_amount)
        return { success: true, message: 'Water intake logged successfully!' }

      case 'get_summary':
        // Summary is already in context, no action needed
        return { success: true, message: '' }

      default:
        return { success: false, message: 'Unknown action type' }
    }
  } catch (error) {
    logger.error('Error executing action:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to execute action',
    }
  }
}

