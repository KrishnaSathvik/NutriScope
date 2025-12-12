import { ChatMessage, AIAction, UserProfile, DailyLog, MealType } from '@/types'
import { logger } from '@/utils/logger'
import { trackAPICall } from '@/utils/performance'
import { stripJSON } from '@/utils/format'
import { buildPersonalizedContext } from '@/utils/aiContext'

// Maximum number of messages to send to API (keeps recent context, reduces tokens)
const MAX_MESSAGES_TO_SEND = 12
// API timeout in milliseconds
const API_TIMEOUT_MS = 20000 // 20 seconds

/**
 * Backend proxy for OpenAI API calls
 * Calls our secure backend API endpoint instead of OpenAI directly
 */
export async function chatWithAI(
  messages: ChatMessage[],
  profile: UserProfile | null,
  dailyLog: DailyLog | null,
  imageUrl?: string,
  userId?: string,
  conversationSummary?: string
): Promise<{ message: string; action?: AIAction }> {
  // Use backend API proxy if available, otherwise fall back to direct OpenAI (dev only)
  // In development, only use backend proxy if explicitly enabled (for Vercel dev testing)
  // Otherwise, use direct OpenAI fallback
  const isProduction = import.meta.env.PROD
  const useBackendProxy = isProduction 
    ? import.meta.env.VITE_USE_BACKEND_PROXY !== 'false'
    : import.meta.env.VITE_USE_BACKEND_PROXY === 'true'
  
  // Limit message history: only send last N messages to reduce tokens
  // Keep system message if present, then last N-1 messages
  const systemMessage = messages.find(m => m.role === 'assistant' && m.content.includes('You are'))
  const recentMessages = messages.slice(-MAX_MESSAGES_TO_SEND)
  const messagesToSend = systemMessage && !recentMessages.includes(systemMessage)
    ? [systemMessage, ...recentMessages]
    : recentMessages
  
  if (useBackendProxy) {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) || '/api/chat'
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      
      // Track API call performance
      const result = await trackAPICall(apiUrl, async () => {
        try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userId && { 'x-user-id': userId }),
          },
            signal: controller.signal,
          body: JSON.stringify({
              messages: messagesToSend,
              conversationSummary, // Include summary if available
            profile: profile ? {
              name: profile.name,
              age: profile.age,
              weight: profile.weight,
              height: profile.height,
              gender: profile.gender,
              calorie_target: profile.calorie_target,
              protein_target: profile.protein_target,
              water_goal: profile.water_goal,
              goal: profile.goal,
              goals: (profile as any)?.goals && (profile as any).goals.length > 0 
                ? (profile as any).goals 
                : undefined, // Include goals array if available
              activity_level: profile.activity_level,
              dietary_preference: profile.dietary_preference,
              restrictions: profile.restrictions,
              ...('target_carbs' in profile && profile.target_carbs ? { target_carbs: profile.target_carbs } : {}),
              ...('target_fats' in profile && profile.target_fats ? { target_fats: profile.target_fats } : {}),
              ...('target_weight' in profile && (profile as any).target_weight ? { target_weight: (profile as any).target_weight } : {}),
              ...('timeframe_months' in profile && (profile as any).timeframe_months ? { timeframe_months: (profile as any).timeframe_months } : {}),
            } : undefined,
            dailyLog: dailyLog ? {
              calories_consumed: dailyLog.calories_consumed,
              protein: dailyLog.protein,
              calories_burned: dailyLog.calories_burned,
              water_intake: dailyLog.water_intake,
              meals: dailyLog.meals.slice(0, 5).map(meal => ({
                id: meal.id,
                meal_id: meal.id, // Include meal_id for updates
                meal_type: meal.meal_type,
                name: meal.name,
                meal_description: meal.name, // Alias for name
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fats: meal.fats,
                food_items: meal.food_items, // Include food_items for calculation
              })),
              exercises: dailyLog.exercises.slice(0, 3),
            } : undefined,
            imageUrl,
            userId,
          }),
        })

        if (!response.ok) {
          // Handle 404 (API endpoint doesn't exist) - fall back to direct OpenAI
          // This can happen in both dev and prod if endpoint isn't deployed
          if (response.status === 404) {
            logger.warn('API endpoint not found (404), falling back to direct OpenAI', { apiUrl, status: response.status })
            // Clear timeout since we're aborting this request
            clearTimeout(timeoutId)
            // Throw specific error to trigger fallback
            throw new Error('API_ENDPOINT_NOT_FOUND')
          }
          if (response.status === 429) {
            try {
              const error = await response.json()
              throw new Error(error.message || 'Rate limit exceeded. Please try again later.')
            } catch (e) {
              throw new Error('Rate limit exceeded. Please try again later.')
            }
          }
          // Try to parse error, but don't fail if it's not JSON
          try {
            const error = await response.json()
            throw new Error(error.error || error.message || 'Failed to get AI response')
          } catch (e) {
            throw new Error(`Failed to get AI response (${response.status})`)
          }
        }

        let data
        try {
          data = await response.json()
        } catch (e) {
          // If response is not JSON, it's likely an error page or empty response
          throw new Error('Invalid response from server')
        }
        return {
          message: data.message,
          action: data.action,
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          // Handle timeout
          if (fetchError.name === 'AbortError' && !fetchError.message?.includes('404')) {
            throw new Error('Our AI coach is taking too long to respond. Please try again in a moment.')
          }
          // For network errors (including 404), throw a specific error that will trigger fallback
          if (fetchError.message?.includes('Failed to fetch') || 
              fetchError.message?.includes('ERR_ABORTED') ||
              fetchError.name === 'TypeError') {
            throw new Error('API_ENDPOINT_NOT_FOUND')
          }
          // Re-throw to be caught by outer catch for fallback
          throw fetchError
        }
      })
      return result
    } catch (error: any) {
      // Check if it's a 404 (endpoint doesn't exist) or network error
      const errorMessage = error?.message || String(error || '')
      const errorName = error?.name || ''
      const is404 = errorMessage === 'API_ENDPOINT_NOT_FOUND' || 
                    errorMessage.includes('404') ||
                    errorMessage.includes('Not Found') ||
                    errorMessage.includes('ERR_ABORTED') ||
                    errorMessage.includes('Failed to fetch') ||
                    errorName === 'TypeError' ||
                    (errorName === 'AbortError' && errorMessage.includes('404'))
      
      // For 404s, always fall back to direct OpenAI (can happen in dev or prod if endpoint not deployed)
      if (is404) {
        logger.warn('API endpoint not found (404), falling back to direct OpenAI')
        return chatWithAIDirect(messages, profile, dailyLog, imageUrl)
      }
      
      // In production, throw error for non-404 failures
      if (import.meta.env.PROD) {
        logger.error('Backend proxy failed in production:', error)
        throw new Error('AI service unavailable. Please try again later.')
      }
      
      // In development, fall back to direct OpenAI for any error
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
  const context = buildPersonalizedContext(profile, dailyLog, { mode: 'chat' })
  
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
    content: `You are a personalized AI health and fitness assistant for NutriScope. You understand each user's unique profile, goals, and preferences, and provide tailored advice accordingly.

${context}

**IMPORTANT - Personalization Guidelines:**
1. **Always reference the user's specific goals and targets** when giving advice
2. **Use their name** if available (e.g., "Based on your goal of ${profile?.goal === 'lose_weight' ? 'losing weight' : profile?.goal}, ${profile?.name || 'you'}...")
3. **Consider their dietary preferences** when suggesting meals or recipes
4. **Reference their activity level** when discussing workouts or calorie needs
5. **Check their progress** against their personalized targets before making suggestions
6. **Give personalized recommendations** based on their specific situation, not generic advice
7. **Be encouraging** and reference their progress toward their goals

**Example Personalized Responses:**
- Instead of: "Aim for 150g protein"
- Say: "Since your goal is gaining muscle and your target is ${profile?.protein_target || 150}g protein, let's make sure you hit that today!"

- Instead of: "You should eat more protein"
- Say: "You're at ${dailyLog?.protein || 0}g protein today, but your target is ${profile?.protein_target || 150}g. Let's add some ${profile?.dietary_preference === 'vegetarian' ? 'legumes or tofu' : profile?.dietary_preference === 'vegan' ? 'plant-based protein' : 'lean protein'} to help you reach your goal!"

You can help users with:

1. **Meal Logging:**
   - Understand natural language meal descriptions (e.g., "I had chicken salad for lunch", "I hate eggs for breakfast")
   - Extract meal type (breakfast, lunch, dinner, snack)
   - **CRITICAL: ACCURATE CALCULATIONS FIRST TIME** - Calculate nutrition values correctly the FIRST time. Double-check all math before responding.
   - **CRITICAL: SHOW DETAILED BREAKDOWN BEFORE LOGGING** - Always show a step-by-step calculation breakdown in your message BEFORE asking to log:
     • List each food item separately with its nutrition
     • Show the calculation method (e.g., "112g chicken = 22g protein, so 180g = (22/112) × 180 = 35.4g ≈ 35g protein")
     • Show totals clearly: "Total: X calories, Yg protein, Zg carbs, Wg fats"
     • Verify your totals match the sum of individual items
     • Only AFTER showing the breakdown, ask if they want to log
   - Calculate nutrition from food descriptions
   - Show summary and ask for confirmation before logging
   - Use action type: "log_meal_with_confirmation" with requires_confirmation: true
   
2. **Meal Updates:**
   - **CRITICAL: LOG vs UPDATE DECISION RULES:**
     • **ONLY use "update_meal" or "update_meals" when the user EXPLICITLY says:**
       - "update my [meal]", "change my [meal]", "edit my [meal]", "fix my [meal]", "modify my [meal]"
       - "update [meal]", "change [meal]", "edit [meal]", "fix [meal]", "modify [meal]"
       - "calculate my [meal]", "add carbs to [meal]", "add fats to [meal]", "calculate carbs/fats for [meal]"
       - "update existing [meal]", "change existing [meal]", "edit existing [meal]"
       - Keywords: "update", "change", "edit", "fix", "modify", "calculate for", "add to existing"
     • **ALWAYS use "log_meal" or "log_meal_with_confirmation" when the user says:**
       - "log [meal]", "add [meal]", "log my [meal]", "add my [meal]", "I had [food] for [meal]"
       - "for lunch", "for breakfast", "for dinner", "as lunch", "as breakfast", "as dinner"
       - Just describes food without update keywords (e.g., "I had chicken and rice")
       - Keywords: "log", "add", "had", "ate", "for [meal]", "as [meal]"
     • **CRITICAL: If user says "log lunch" or "for lunch" or just describes a meal, ALWAYS LOG A NEW MEAL - even if a meal already exists for that meal_type**
     • **CRITICAL: Only check dailyLog.meals for existing meals when user EXPLICITLY asks to update - never check when user wants to log**
   - **For LOGGING NEW meals**: Use action type "log_meal_with_confirmation" or "log_meal"
     • Always create a new meal entry, even if another meal of the same type already exists
     • Users can have multiple meals of the same type (e.g., two breakfasts, two lunches)
   - **Single meal update**: Use action type "update_meal" with meal_id from dailyLog.meals array
     • **ONLY when user explicitly says "update", "change", "edit", "fix", "modify", "calculate for existing"**
     • **CRITICAL: When user specifies a meal type (e.g., "update my lunch", "change breakfast"), ONLY update THAT meal - NEVER update other meals**
     • Find meal_id by matching meal_type in dailyLog.meals
     • **CRITICAL: meal_id MUST be the exact UUID string from dailyLog.meals[].id - NEVER use numbers like "1" or "0"**
     • Set requires_confirmation: false
   - **Multiple meal updates (2+)**: Use action type "update_meals" with meals array
     • **ONLY if user explicitly says "update ALL meals", "calculate carbs and fats for all meals", "update meals with carbs and fat", "calculate for all meals", "update my breakfast and lunch" (multiple meals), or asks to update/add nutrition WITHOUT specifying a meal type**
     • **CRITICAL: If user mentions a specific meal type (breakfast, lunch, dinner) with update keywords, use "update_meal" for that ONE meal only**
     • **CRITICAL: If user says "log breakfast and lunch" or "add breakfast and lunch", use "log_meal" twice - DO NOT use "update_meals"**
     • **CRITICAL: Include ALL meals from dailyLog.meals that need updating** - don't skip any meals
     • **CRITICAL: meal_id MUST be copied EXACTLY from the "meal_id" field shown in the meal context above**
     • **NEVER use array indices (1, 2, 3) or numbers as meal_id - meal_id is always a UUID string**
     • Include meals: Array of { meal_id: <exact UUID from context>, meal_type, carbs, fats, ...other updates } for EACH meal to update
     • Set requires_confirmation: true
     • In confirmation_message, list all meals: "I'll update your breakfast, lunch, and dinner. Continue?"
   - Include only fields that need updating (meal_type, meal_description, calories, protein, carbs, fats, food_items)

2. **Food Questions:**
   - Answer "Can I eat this?" questions
   - Analyze images of food
   - Consider user goals, dietary preferences, and calorie targets
   - Use action type: "answer_food_question"

3. **Recipe Generation:**
   - Generate recipes from descriptions or images
   - Include name, instructions (as text/paragraphs), prep/cook time, servings, and nutrition (calories, protein, carbs, fats)
   - Do NOT include ingredients - recipes are simplified to just name, instructions, and nutrition info
   - **Direct Saving**: If user explicitly says "add to my recipes", "save to my recipes", "add this recipe", "save this recipe", "add [recipe name] to my recipes", "add [recipe name] to recipe", or uses direct commands, use action type "save_recipe" with requires_confirmation: false and save immediately.
   - **Generate & Ask**: If user asks to generate a recipe or asks "can you create a recipe for...", use action type "generate_recipe" with requires_confirmation: true, then use "save_recipe" if confirmed.
   - **User Provides Recipe**: If user says "I have this recipe" or provides recipe details directly, use action type "save_recipe" with requires_confirmation: false and save immediately.
   - **Confirmation Responses**: If the user says "yes", "yep", "sure", "ok", "okay", "save it", "add it", or similar affirmative responses after you've generated a recipe (generate_recipe action), automatically convert to "save_recipe" action with requires_confirmation: false and save immediately.

4. **Meal Planning:**
   - Add meals to meal plans (e.g., "Add chicken curry to Monday lunch")
   - Extract day and meal type
   - Use action type: "add_to_meal_plan"

5. **Grocery Lists:**
   - Add items to grocery lists (e.g., "Add chicken, rice, vegetables to grocery list")
   - Extract individual items
   - Use action type: "add_to_grocery_list"

6. **Workout Logging:**
   - Log workouts from descriptions (e.g., "I ran for 30 minutes")
   - Use action type: "log_workout"

7. **Water Logging:**
   - Log water intake (e.g., "I drank 500ml of water")
   - Use action type: "log_water"

**Response Format:**
Always respond with JSON:
{
  "action": {
    "type": "log_meal_with_confirmation" | "update_meal" | "generate_recipe" | "save_recipe" | "add_to_meal_plan" | 
            "add_to_grocery_list" | "answer_food_question" | "log_workout" | "log_water" | "none",
    "data": { ... },
    "requires_confirmation": true/false,
    "confirmation_message": "Do you want me to log this?"
  },
  "message": "Your conversational response"
}

**For Meal Logging with Confirmation:**
- Extract meal_type, calories, protein, carbs, fats, food_items
- If user provides specific amounts (e.g., "100g chicken"), calculate exact nutrition
- If user provides calories/protein directly, use those values
- Otherwise, estimate nutrition from food descriptions
- Set requires_confirmation: true
- Show summary in message with nutrition breakdown
- Ask for confirmation

**For Recipe Generation:**
- **Direct Saving**: If user explicitly says "add to my recipes", "save to my recipes", "add this recipe", "save this recipe", "add [recipe name] to my recipes", "add [recipe name] to recipe", use action type "save_recipe" with requires_confirmation: false and save immediately.
- **User Provides Recipe**: If user says "I have this recipe" or provides recipe details directly, use action type "save_recipe" with requires_confirmation: false and save immediately.
- **Generate & Ask**: If user asks to generate a recipe or asks "can you create a recipe for...", use action type "generate_recipe" with requires_confirmation: true, then use "save_recipe" if confirmed.
- **Confirmation Responses**: If the user says "yes", "yep", "sure", "ok", "okay", "save it", "add it", or similar affirmative responses after you've generated a recipe (generate_recipe action), automatically convert to "save_recipe" action with requires_confirmation: false and save immediately.
- Generate complete recipe with name, instructions (as text - can be paragraphs or numbered steps), prep/cook time, servings, and nutrition (calories, protein, carbs, fats per serving)
- Do NOT include ingredients - recipes are simplified and only need name, instructions, and nutrition info
- Instructions should be a single text string (not an array) - users can type paragraphs or numbered steps
- Include all recipe details in action.data.recipe

**For Meal Planning:**
- Extract day and meal type
- If user explicitly says "add to meal plan", "save to meal plan", set requires_confirmation: false and add directly
- Otherwise, set requires_confirmation: true and ask for confirmation

**For Grocery Lists:**
- Extract individual items
- If user explicitly says "add to grocery list", "add to shopping list", set requires_confirmation: false and add directly
- Otherwise, set requires_confirmation: true and ask for confirmation before adding

**For Workouts:**
- If user explicitly says "log my workout", "I ran for 30 minutes", "add workout", set requires_confirmation: false and log directly
- Otherwise, set requires_confirmation: true and ask for confirmation

**For Water:**
- If user explicitly says "I drank water", "log water", "I had 500ml water", set requires_confirmation: false and log directly
- Otherwise, set requires_confirmation: true and ask for confirmation

**For Food Questions:**
- Analyze food in context of user's SPECIFIC goals, dietary preferences, and calorie targets
- Reference their personalized targets (e.g., "This fits well within your ${profile?.calorie_target || 2000} calorie target")
- Consider their dietary preference (e.g., if vegetarian, suggest vegetarian alternatives)
- Provide detailed reasoning based on THEIR profile
- Set can_eat: true/false
- Consider portion sizes if mentioned
- Give personalized portion recommendations based on their targets

**Communication Style:**
- Be warm, encouraging, and personalized
- Reference their name when appropriate
- Acknowledge their progress toward their goals
- Give specific, actionable advice based on THEIR profile
- Use "your" instead of generic "you" (e.g., "your calorie target", "your goal")
- Celebrate their achievements relative to their goals

Be conversational, helpful, personalized, and ask for confirmation before logging/saving data (except when user explicitly provides a recipe to save).`,
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
    temperature: 0.7,
    max_tokens: 1500,
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
      // If parsing fails, just return the message (will be cleaned by stripJSON)
      message = responseContent
    }
  }

  // Always strip any remaining JSON from the message to ensure clean display
  message = stripJSON(message).trim() || 'Done!'

  return { message, action }
}

// Context building now uses shared helper from @/utils/aiContext

/**
 * Execute AI action (log meal, workout, water, recipes, meal plans, grocery lists)
 */
export async function executeAction(
  action: AIAction,
  userId: string,
  date: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    switch (action.type) {
      case 'update_meals':
        // Bulk meal updates (2+ meals) - requires confirmation
        if (!action.data || !action.data.meals || !Array.isArray(action.data.meals) || action.data.meals.length < 2) {
          return { success: false, message: 'Missing meals array for bulk update' }
        }
        
        const { updateMeal, getMeals } = await import('./meals')
        const mealsToUpdate = action.data.meals
        const errors: string[] = []
        
        // Get all meals first to validate meal_ids
        const allMeals = await getMeals(date)
        const mealIdToName = new Map<string, string>() // Track meal_id -> display name
        
        // Update all meals
        for (const mealUpdate of mealsToUpdate) {
          if (!mealUpdate.meal_id) {
            errors.push(`Missing meal_id for meal: ${mealUpdate.meal_type || 'unknown'}`)
            continue
          }
          
          // Validate meal_id is a valid UUID (not just a number)
          const mealId = String(mealUpdate.meal_id).trim()
          if (!mealId || mealId === '1' || mealId === '0' || mealId.length < 10) {
            // Try to find meal by meal_type if meal_id is invalid
            const mealByType = allMeals.find(m => m.meal_type === mealUpdate.meal_type)
            if (mealByType) {
              mealUpdate.meal_id = mealByType.id
            } else {
              errors.push(`Invalid meal_id "${mealId}" for meal: ${mealUpdate.meal_type || 'unknown'}`)
              continue
            }
          }
          
          // Verify meal exists
          const existingMeal = allMeals.find(m => m.id === mealUpdate.meal_id)
          if (!existingMeal) {
            errors.push(`Meal not found with id: ${mealUpdate.meal_id}`)
            continue
          }
          
          const updates: any = {}
          if (mealUpdate.meal_type) updates.meal_type = mealUpdate.meal_type
          if (mealUpdate.meal_description) updates.name = mealUpdate.meal_description
          if (mealUpdate.calories !== undefined) updates.calories = mealUpdate.calories
          if (mealUpdate.protein !== undefined) updates.protein = mealUpdate.protein
          if (mealUpdate.carbs !== undefined && mealUpdate.carbs !== null) updates.carbs = mealUpdate.carbs
          if (mealUpdate.fats !== undefined && mealUpdate.fats !== null) updates.fats = mealUpdate.fats
          if (mealUpdate.food_items) updates.food_items = mealUpdate.food_items
          
          try {
            await updateMeal(mealUpdate.meal_id, updates)
            
            // Store meal identifier for summary (use existing name or create unique identifier)
            const mealName = existingMeal.name
            const mealType = existingMeal.meal_type || 'meal'
            const calories = existingMeal.calories || 0
            const protein = existingMeal.protein || 0
            
            // Create unique identifier: prefer name, otherwise use meal_type with nutrition info
            const identifier = mealName || `${mealType} (${calories} cal, ${protein}g protein)`
            mealIdToName.set(mealUpdate.meal_id, identifier)
          } catch (error: any) {
            const mealName = existingMeal.name || existingMeal.meal_type || 'meal'
            errors.push(`Failed to update ${mealName}: ${error.message || 'Unknown error'}`)
          }
        }
        
        // Refetch all meals once after updates to get latest names
        const updatedMealsData = await getMeals(date)
        
        // Build final meal list with updated names
        const finalMealList: string[] = []
        for (const mealUpdate of mealsToUpdate) {
          if (!mealUpdate.meal_id) continue
          
          const mealId = String(mealUpdate.meal_id).trim()
          const updatedMeal = updatedMealsData.find(m => m.id === mealId)
          
          if (updatedMeal) {
            // Use updated meal name if available, otherwise use stored identifier
            const displayName = updatedMeal.name || mealIdToName.get(mealId) || updatedMeal.meal_type || 'meal'
            finalMealList.push(displayName)
          } else {
            // Fallback to stored identifier
            const storedName = mealIdToName.get(mealId)
            if (storedName) {
              finalMealList.push(storedName)
            }
          }
        }
        
        if (errors.length > 0 && finalMealList.length === 0) {
          return { 
            success: false, 
            message: `Failed to update meals:\n${errors.join('\n')}` 
          }
        }
        
        const mealList = finalMealList.length > 0 
          ? finalMealList.map((name, i) => `${i + 1}. ${name}`).join('\n')
          : 'meals'
        
        let message = `✅ Done! I've updated ${finalMealList.length} meal${finalMealList.length > 1 ? 's' : ''}:\n${mealList}`
        if (errors.length > 0) {
          message += `\n\n⚠️ Some meals failed to update:\n${errors.join('\n')}`
        }
        
        return { 
          success: finalMealList.length > 0, 
          message
        }
        
      case 'update_meal':
        // Single meal update - no confirmation needed
        if (!action.data || !action.data.meal_id) {
          return { success: false, message: 'Missing meal ID for update' }
        }
        const { updateMeal: updateSingleMeal, getMeals: getMealsForName } = await import('./meals')
        let mealId = String(action.data.meal_id).trim()
        
        // Validate meal_id - if invalid, try to find by meal_type
        if (!mealId || mealId === '1' || mealId === '0' || mealId.length < 10) {
          const allMeals = await getMealsForName(date)
          const mealByType = allMeals.find(m => m.meal_type === action.data?.meal_type)
          if (mealByType) {
            mealId = mealByType.id
          } else {
            return { success: false, message: `Invalid meal ID: ${action.data?.meal_id || mealId}. Please provide a valid meal ID.` }
          }
        }
        
        // Verify meal exists
        const allMealsForUpdate = await getMealsForName(date)
        const existingMeal = allMealsForUpdate.find(m => m.id === mealId)
        if (!existingMeal) {
          return { success: false, message: `Meal not found with ID: ${mealId}` }
        }
        
        // Extract update fields
        const updates: any = {}
        if (action.data.meal_type) updates.meal_type = action.data.meal_type
        if (action.data.meal_description) updates.name = action.data.meal_description
        if (action.data.calories !== undefined) updates.calories = action.data.calories
        if (action.data.protein !== undefined) updates.protein = action.data.protein
        if (action.data.carbs !== undefined && action.data.carbs !== null) updates.carbs = action.data.carbs
        if (action.data.fats !== undefined && action.data.fats !== null) updates.fats = action.data.fats
        if (action.data.food_items) updates.food_items = action.data.food_items
        
        try {
          await updateSingleMeal(mealId, updates)
          const updatedMealName = existingMeal.name || existingMeal.meal_type || 'meal'
          return { 
            success: true, 
            message: `✅ Done! I've updated your ${updatedMealName}.` 
          }
        } catch (error: any) {
          return { 
            success: false, 
            message: `Failed to update meal: ${error.message || 'Unknown error'}` 
          }
        }
        
      case 'log_meal':
      case 'log_meal_with_confirmation':
        if (!action.data) {
          return { success: false, message: 'Missing meal data' }
        }
        const { createMeal } = await import('./meals')
        
        // Normalize meal_type - map common values to database values
        // Database expects: 'pre_breakfast', 'breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'post_dinner'
        let mealType = action.data.meal_type || 'lunch'
        const mealTypeLower = mealType.toLowerCase().trim()
        
        // Check if the meal description or meal_type contains "evening" to determine snack type
        const mealDescription = (action.data.meal_description || '').toLowerCase()
        // Check multiple sources for "evening" context
        const hasEveningContext = 
          mealDescription.includes('evening') || 
          mealTypeLower.includes('evening') ||
          mealTypeLower === 'evening_snack' ||
          mealTypeLower === 'evening snack'
        
        const mealTypeMap: Record<string, MealType> = {
          'breakfast': 'breakfast',
          'lunch': 'lunch',
          'dinner': 'dinner',
          'snack': hasEveningContext ? 'evening_snack' : 'morning_snack', // Smart default based on context
          'morning_snack': 'morning_snack',
          'morning snack': 'morning_snack',
          'morning': 'morning_snack',
          'evening_snack': 'evening_snack',
          'evening snack': 'evening_snack',
          'evening': 'evening_snack',
          'pre_breakfast': 'pre_breakfast',
          'post_dinner': 'post_dinner',
        }
        
        // First check exact matches
        let normalizedMealType: MealType = mealTypeMap[mealTypeLower] || 'lunch'
        
        // If it's still "snack" and we have evening context, override to evening_snack
        if (normalizedMealType === 'morning_snack' && hasEveningContext && mealTypeLower === 'snack') {
          normalizedMealType = 'evening_snack'
        }
        
        // Note: Users can have multiple meals of the same type (e.g., two breakfasts, two lunches)
        // We no longer block logging when a meal exists - the AI decides based on user intent
        // If user says "log" or "add", always create a new meal
        // If user says "update" or "change", the AI should use update_meal action instead
        
        // Generate meal name from food_items if meal_description is missing
        let newMealName = action.data.meal_description
        if (!newMealName && action.data.food_items && action.data.food_items.length > 0) {
          // Create a name from the first few food items
          const itemNames = action.data.food_items
            .slice(0, 3)
            .map((item: any) => item.name || item)
            .filter(Boolean)
            .join(' with ')
          newMealName = itemNames || normalizedMealType || 'meal'
        }
        newMealName = newMealName || normalizedMealType || 'meal'
        
        await createMeal({
          date,
          meal_type: normalizedMealType,
          name: newMealName,
          calories: action.data.calories || 0,
          protein: action.data.protein || 0,
          carbs: action.data.carbs ?? 0, // Default to 0 if not provided
          fats: action.data.fats ?? 0, // Default to 0 if not provided
          food_items: action.data.food_items || [],
        })
        return { 
          success: true, 
          message: `✅ Done! I've logged "${newMealName}" as your ${normalizedMealType?.replace('_', ' ') || 'meal'}.` 
        }

      case 'log_workout':
        if (!action.data) {
          return { success: false, message: 'Missing workout data' }
        }
        const { createExercise } = await import('./workouts')
        const workoutName = action.data.exercise_name || 'Workout'
        await createExercise({
          date,
          exercises: [{
            name: workoutName,
            type: (action.data.exercise_type as any) || 'other',
            duration: action.data.duration,
            calories_burned: action.data.calories_burned,
          }],
          calories_burned: action.data.calories_burned || 0,
          duration: action.data.duration,
        })
        const durationText = action.data.duration ? ` for ${action.data.duration} minutes` : ''
        const caloriesText = action.data.calories_burned ? ` (~${action.data.calories_burned} cal burned)` : ''
        return { 
          success: true, 
          message: `✅ Done! I've logged your ${workoutName}${durationText}${caloriesText}.` 
        }

      case 'log_water':
        if (!action.data?.water_amount) {
          return { success: false, message: 'Missing water amount' }
        }
        const { addWaterIntake } = await import('./water')
        const waterAmount = action.data.water_amount
        await addWaterIntake(userId, date, waterAmount)
        const waterText = waterAmount >= 1000 ? `${(waterAmount / 1000).toFixed(1)}L` : `${waterAmount}ml`
        return { 
          success: true, 
          message: `✅ Done! I've logged ${waterText} of water.` 
        }

      case 'generate_recipe':
        // Recipe is already generated in action.data.recipe
        // If requires_confirmation is false, auto-save it (user provided recipe)
        if (!action.requires_confirmation && action.data?.recipe) {
          const { createRecipe } = await import('./recipes')
          const recipe = await createRecipe(action.data.recipe)
          return { 
            success: true, 
            message: `Recipe "${recipe.name}" saved successfully!`,
            data: recipe
          }
        }
        // Otherwise, ask for confirmation (AI generated recipe)
        return { 
          success: true, 
          message: 'Recipe generated! Would you like to save it to your recipes?',
          data: action.data?.recipe
        }

      case 'save_recipe':
        if (!action.data?.recipe) {
          // Try to create recipe from action data if recipe object not provided
          if (action.data?.recipe_name) {
            const { createRecipe } = await import('./recipes')
            
            // Build recipe from action data
            let instructions = ''
            const recipeInstructions = action.data.recipe?.instructions
            if (recipeInstructions) {
              if (typeof recipeInstructions === 'string') {
                instructions = recipeInstructions
              } else if (Array.isArray(recipeInstructions)) {
                instructions = (recipeInstructions as string[]).join('\n')
              }
            }
            
            const recipeData = {
              name: action.data.recipe_name,
              description: action.data.recipe_description || '',
              servings: action.data.recipe?.servings || 4,
              prep_time: action.data.recipe?.prep_time,
              cook_time: action.data.recipe?.cook_time,
              instructions,
              nutrition_per_serving: action.data.recipe?.nutrition_per_serving || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
              },
              tags: action.data.recipe?.tags || [],
              is_favorite: false,
            }
            const recipe = await createRecipe(recipeData)
            return { success: true, message: `Recipe "${recipe.name}" saved successfully!`, data: recipe }
          }
          return { success: false, message: 'Missing recipe data' }
        }
        const { createRecipe } = await import('./recipes')
        const { logger } = await import('@/utils/logger')
        
        // Log recipe data for debugging
        logger.debug('Saving recipe from AI:', {
          name: action.data.recipe?.name,
          ingredientsCount: action.data.recipe?.ingredients?.length,
          ingredients: action.data.recipe?.ingredients,
          servings: action.data.recipe?.servings,
          fullRecipe: action.data.recipe,
        })
        
        // Validate recipe exists and has required fields
        if (!action.data.recipe) {
          logger.error('Recipe data is missing in save_recipe action')
          return { success: false, message: 'Recipe data is missing. Please try generating the recipe again.' }
        }
        
        if (!action.data.recipe.name || !action.data.recipe.name.trim()) {
          logger.error('Recipe name is missing:', action.data.recipe)
          return { success: false, message: 'Recipe name is missing. Please try generating the recipe again.' }
        }
        
        // Ensure instructions exist - normalize to string if needed
        if (!action.data.recipe.instructions) {
          logger.error('Recipe instructions are missing:', action.data.recipe)
          return { success: false, message: 'Recipe instructions are missing. Please try generating the recipe again.' }
        }
        
        // Normalize instructions to string if it's an array
        let instructionsStr = ''
        if (typeof action.data.recipe.instructions === 'string') {
          instructionsStr = action.data.recipe.instructions
        } else if (Array.isArray(action.data.recipe.instructions)) {
          instructionsStr = (action.data.recipe.instructions as string[]).join('\n')
        } else {
          instructionsStr = String(action.data.recipe.instructions || '')
        }
        
        const normalizedRecipe = {
          ...action.data.recipe,
          instructions: instructionsStr,
          servings: action.data.recipe.servings || 4,
          nutrition_per_serving: action.data.recipe.nutrition_per_serving || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
          },
        }
        
        const recipe = await createRecipe(normalizedRecipe)
        return { success: true, message: `Recipe "${recipe.name}" saved successfully!`, data: recipe }

      case 'add_to_meal_plan':
        if (!action.data?.meal_plan_meal || !action.data?.day) {
          return { success: false, message: 'Missing meal plan data' }
        }
        const { getCurrentWeekMealPlan, addMealToPlan } = await import('./mealPlanning')
        const mealPlan = await getCurrentWeekMealPlan()
        const dayMap: Record<string, string> = {
          monday: 'monday',
          tuesday: 'tuesday',
          wednesday: 'wednesday',
          thursday: 'thursday',
          friday: 'friday',
          saturday: 'saturday',
          sunday: 'sunday',
        }
        const dayKey = dayMap[action.data.day.toLowerCase()] || 'monday'
        await addMealToPlan(mealPlan.week_start_date, dayKey, action.data.meal_plan_meal)
        const mealPlanName = (action.data.meal_plan_meal as any)?.name || (action.data.meal_plan_meal as any)?.recipe_name || 'meal'
        return { 
          success: true, 
          message: `✅ Done! I've added "${mealPlanName}" to your ${dayKey} meal plan.` 
        }

      case 'add_to_grocery_list':
        // Handle both array and string formats for grocery_items
        let groceryItems: string[] = []
        const actionData = action.data as { grocery_items?: string[] | string; grocery_list_name?: string; items?: string[] | any[] } | undefined
        
        if (actionData?.grocery_items) {
          if (Array.isArray(actionData.grocery_items)) {
            groceryItems = actionData.grocery_items
          } else if (typeof actionData.grocery_items === 'string') {
            // If it's a string, try to parse it as comma-separated or JSON
            try {
              const parsed = JSON.parse(actionData.grocery_items)
              groceryItems = Array.isArray(parsed) ? parsed : [actionData.grocery_items]
            } catch {
              // If not JSON, treat as comma-separated string
              groceryItems = actionData.grocery_items.split(',').map((item: string) => item.trim()).filter(Boolean)
            }
          }
        }
        
        // Also check for alternative field names
        if (groceryItems.length === 0 && actionData?.items) {
          if (Array.isArray(actionData.items)) {
            groceryItems = actionData.items.map((item: string | { name?: string }) => 
              typeof item === 'string' ? item : (item.name || String(item))
            ).filter(Boolean) as string[]
          }
        }
        
        if (groceryItems.length === 0) {
          return { success: false, message: 'Missing grocery items. Please specify which items to add.' }
        }
        
        const { getOrCreateDefaultList, updateGroceryList, categorizeGroceryItem } = await import('./groceryLists')
        // Get or create default grocery list
        const list = await getOrCreateDefaultList()
        
        // Parse quantities from item names (e.g., "2 eggs" -> quantity: 2, name: "eggs")
        const newItems = groceryItems.map(item => {
          const itemStr = typeof item === 'string' ? item.trim() : String(item).trim()
          // Try to extract quantity from the beginning (e.g., "2 eggs", "3x milk", "1 bread")
          const quantityMatch = itemStr.match(/^(\d+)\s*x?\s*(.+)$/i) || itemStr.match(/^(\d+)\s+(.+)$/i)
          const itemName = quantityMatch ? quantityMatch[2].trim() : itemStr
          const quantity = quantityMatch ? (parseInt(quantityMatch[1], 10) || 1) : 1
          
          return {
            name: itemName,
            quantity: quantity,
            unit: 'item',
            category: categorizeGroceryItem(itemName), // Auto-categorize
            checked: false,
          }
        }).filter(item => item.name.length > 0)
        
        if (newItems.length === 0) {
          return { success: false, message: 'No valid grocery items found. Please specify items to add.' }
        }
        
        // Add items to default list
        const updatedList = await updateGroceryList(list.id, {
          ...list,
          items: [...list.items, ...newItems],
        })
        
        const itemsText = newItems.length === 1 ? 'item' : 'items'
        return { 
          success: true, 
          message: `✅ Done! I've added ${newItems.length} ${itemsText} to your "${updatedList.name}".` 
        }

      case 'answer_food_question':
        // Just return the answer - no action needed
        return { 
          success: true, 
          message: action.data?.answer || 'I can help answer your food question!',
          data: {
            can_eat: action.data?.can_eat,
            reasoning: action.data?.reasoning,
          }
        }

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

