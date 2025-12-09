import { ChatMessage, AIAction, UserProfile, DailyLog } from '@/types'
import { logger } from '@/utils/logger'
import { trackAPICall } from '@/utils/performance'

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
      
      // Track API call performance
      const result = await trackAPICall(apiUrl, async () => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userId && { 'x-user-id': userId }),
          },
          body: JSON.stringify({
            messages,
            profile: profile ? {
              name: profile.name,
              age: profile.age,
              weight: profile.weight,
              height: profile.height,
              calorie_target: profile.calorie_target,
              protein_target: profile.protein_target,
              water_goal: profile.water_goal,
              goal: profile.goal,
              activity_level: profile.activity_level,
              dietary_preference: profile.dietary_preference,
              restrictions: profile.restrictions,
              ...('target_carbs' in profile && profile.target_carbs ? { target_carbs: profile.target_carbs } : {}),
              ...('target_fats' in profile && profile.target_fats ? { target_fats: profile.target_fats } : {}),
            } : undefined,
            dailyLog: dailyLog ? {
              calories_consumed: dailyLog.calories_consumed,
              protein: dailyLog.protein,
              calories_burned: dailyLog.calories_burned,
              water_intake: dailyLog.water_intake,
              meals: dailyLog.meals.slice(0, 5),
              exercises: dailyLog.exercises.slice(0, 3),
            } : undefined,
            imageUrl,
            userId,
          }),
        })

        if (!response.ok) {
          // Handle 404 (API endpoint doesn't exist in dev) - fall back to direct OpenAI
          if (response.status === 404) {
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
      })
      return result
    } catch (error: any) {
      // In production, always use backend proxy - no fallback
      if (import.meta.env.PROD) {
        logger.error('Backend proxy failed in production:', error)
        throw new Error('AI service unavailable. Please try again later.')
      }
      // Fall back to direct OpenAI only in development
      // Check if it's a 404 (endpoint doesn't exist) or network error
      const errorMessage = error?.message || String(error || '')
      const is404 = errorMessage === 'API_ENDPOINT_NOT_FOUND' || 
                    errorMessage.includes('404') ||
                    errorMessage.includes('Not Found') ||
                    errorMessage.includes('ERR_ABORTED') ||
                    errorMessage.includes('Failed to fetch')
      
      if (is404) {
        logger.debug('API endpoint not found in development, using direct OpenAI')
      } else {
        logger.warn('Backend proxy failed, falling back to direct OpenAI:', error)
      }
      // Always fall back to direct OpenAI in development
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
   - Calculate nutrition from food descriptions
   - Show summary and ask for confirmation before logging
   - Use action type: "log_meal_with_confirmation" with requires_confirmation: true

2. **Food Questions:**
   - Answer "Can I eat this?" questions
   - Analyze images of food
   - Consider user goals, dietary preferences, and calorie targets
   - Use action type: "answer_food_question"

3. **Recipe Generation:**
   - Generate recipes from descriptions or images
   - Include name, instructions (as text/paragraphs), prep/cook time, servings, and nutrition (calories, protein, carbs, fats)
   - Do NOT include ingredients - recipes are simplified to just name, instructions, and nutrition info
   - Ask if user wants to save recipe
   - Use action type: "generate_recipe" then "save_recipe" if confirmed

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
    "type": "log_meal_with_confirmation" | "generate_recipe" | "save_recipe" | "add_to_meal_plan" | 
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
- If user says "I have this recipe" or provides recipe details, automatically save it (requires_confirmation: false)
- If user asks to generate a recipe, generate it and ask for confirmation (requires_confirmation: true)
- Generate complete recipe with name, instructions (as text - can be paragraphs or numbered steps), prep/cook time, servings, and nutrition (calories, protein, carbs, fats per serving)
- Do NOT include ingredients - recipes are simplified and only need name, instructions, and nutrition info
- Instructions should be a single text string (not an array) - users can type paragraphs or numbered steps
- Include all recipe details in action.data.recipe

**For Meal Planning:**
- Extract day and meal type
- Set requires_confirmation: true
- Ask for confirmation

**For Grocery Lists:**
- Extract individual items
- Set requires_confirmation: true
- Ask for confirmation before adding

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
      // If parsing fails, just return the message
      message = responseContent
    }
  }

  return { message, action }
}

/**
 * Build enhanced personalized context from user profile and daily log
 */
function buildContext(profile: UserProfile | null, dailyLog: DailyLog | null): string {
  let context = ''
  
  if (profile) {
    // Personalized greeting with name if available
    const userName = profile.name ? `Hi ${profile.name}! ` : ''
    
    context += `${userName}Here's your personalized profile:\n\n`
    
    // Personal details
    if (profile.age || profile.weight || profile.height) {
      context += `**About You:**\n`
      if (profile.name) context += `- Name: ${profile.name}\n`
      if (profile.age) context += `- Age: ${profile.age} years\n`
      if (profile.weight) context += `- Weight: ${profile.weight}kg\n`
      if (profile.height) context += `- Height: ${profile.height}cm\n`
      context += `\n`
    }
    
    // Goals and preferences
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
    
    context += `**Your Goals & Preferences:**\n`
    context += `- Primary Goal: ${goalDescriptions[profile.goal] || profile.goal}\n`
    context += `- Activity Level: ${activityDescriptions[profile.activity_level] || profile.activity_level}\n`
    context += `- Dietary Preference: ${dietaryDescriptions[profile.dietary_preference] || profile.dietary_preference}\n`
    if (profile.restrictions && profile.restrictions.length > 0) {
      context += `- Dietary Restrictions: ${profile.restrictions.join(', ')}\n`
    }
    context += `\n`
    
    // Personalized targets
    context += `**Your Personalized Targets:**\n`
    context += `- Daily Calorie Target: ${profile.calorie_target || 2000} calories\n`
    context += `- Daily Protein Target: ${profile.protein_target || 150}g\n`
    context += `- Daily Water Goal: ${profile.water_goal || 2000}ml\n`
    if ('target_carbs' in profile && profile.target_carbs) context += `- Daily Carbs Target: ${profile.target_carbs}g\n`
    if ('target_fats' in profile && profile.target_fats) context += `- Daily Fats Target: ${profile.target_fats}g\n`
    context += `\n`
    
    // Personalized guidance based on goals
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

  if (dailyLog) {
    const calorieProgress = profile?.calorie_target ? ((dailyLog.calories_consumed / profile.calorie_target) * 100).toFixed(0) : '0'
    const proteinProgress = profile?.protein_target ? ((dailyLog.protein / profile.protein_target) * 100).toFixed(0) : '0'
    const waterProgress = profile?.water_goal ? ((dailyLog.water_intake / profile.water_goal) * 100).toFixed(0) : '0'
    
    context += `**Today's Progress:**\n`
    context += `- Calories: ${dailyLog.calories_consumed} / ${profile?.calorie_target || 2000} cal (${calorieProgress}%)\n`
    context += `- Protein: ${dailyLog.protein}g / ${profile?.protein_target || 150}g (${proteinProgress}%)\n`
    context += `- Water: ${dailyLog.water_intake}ml / ${profile?.water_goal || 2000}ml (${waterProgress}%)\n`
    context += `- Calories Burned: ${dailyLog.calories_burned} cal\n`
    context += `- Meals Logged: ${dailyLog.meals.length}\n`
    context += `- Workouts Logged: ${dailyLog.exercises.length}\n`
    
    if (dailyLog.meals.length > 0) {
      context += `\n**Recent Meals:**\n`
      dailyLog.meals.slice(0, 3).forEach((m, i) => {
        context += `${i + 1}. ${m.meal_type || 'meal'}: ${m.calories} cal, ${m.protein}g protein`
        if (m.name) context += ` (${m.name})`
        context += `\n`
      })
    }
    
    // Personalized suggestions based on progress
    if (profile) {
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
    }
    context += `\n`
  }

  return context
}

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
      case 'log_meal':
      case 'log_meal_with_confirmation':
        if (!action.data) {
          return { success: false, message: 'Missing meal data' }
        }
        const { createMeal } = await import('./meals')
        await createMeal({
          date,
          meal_type: action.data.meal_type || 'lunch',
          name: action.data.meal_description || undefined,
          calories: action.data.calories || 0,
          protein: action.data.protein || 0,
          carbs: action.data.carbs,
          fats: action.data.fats,
          food_items: action.data.food_items || [],
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
        
        const recipe = await createRecipe(action.data.recipe)
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
        return { success: true, message: `Meal added to ${dayKey}'s meal plan!` }

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
        
        return { success: true, message: `Added ${newItems.length} item(s) to "${updatedList.name}"!` }

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

