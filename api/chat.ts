/**
 * Backend API Proxy for OpenAI Chat
 * Vercel Serverless Function
 * 
 * This endpoint proxies OpenAI API calls to:
 * 1. Keep API keys secure (server-side only)
 * 2. Implement rate limiting
 * 3. Add server-side validation
 * 4. Log and monitor API usage
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

// Rate limiting storage
// NOTE: In-memory Map works fine for single-instance deployments (Vercel serverless functions)
// For multi-instance deployments, use Vercel KV or Redis
// See PRODUCTION_FIXES.md for upgrade instructions
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute per user
}

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string | Array<{ type: string; image_url?: { url: string } }>
  }>
  profile?: {
    name?: string
    age?: number
    weight?: number
    height?: number
    calorie_target?: number
    protein_target?: number
    water_goal?: number
    goal?: string
    activity_level?: string
    dietary_preference?: string
    restrictions?: string[]
    target_carbs?: number
    target_fats?: number
  }
  dailyLog?: {
    calories_consumed?: number
    protein?: number
    calories_burned?: number
    water_intake?: number
    meals?: Array<{
      meal_type?: string
      calories?: number
      protein?: number
      name?: string
    }>
    exercises?: Array<{
      name?: string
      calories_burned?: number
    }>
  }
  imageUrl?: string
}

/**
 * Rate limiting middleware
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    const resetTime = now + RATE_LIMIT.windowMs
    rateLimitStore.set(userId, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetTime }
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime }
  }

  // Increment count
  userLimit.count++
  rateLimitStore.set(userId, userLimit)
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - userLimit.count,
    resetTime: userLimit.resetTime,
  }
}

/**
 * Validate request payload
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' }
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { valid: false, error: 'Messages array is required and must not be empty' }
  }

  // Validate message structure
  for (const msg of body.messages) {
    if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: 'Invalid message role' }
    }
    if (!msg.content) {
      return { valid: false, error: 'Message content is required' }
    }
  }

  // Validate message length
  const totalLength = JSON.stringify(body.messages).length
  if (totalLength > 100000) {
    return { valid: false, error: 'Message payload too large (max 100KB)' }
  }

  return { valid: true }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user ID from authorization header or request
    const userId = req.headers['x-user-id'] as string || req.body.userId || 'anonymous'
    
    // Check rate limit
    const rateLimit = checkRateLimit(userId)
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        resetTime: rateLimit.resetTime,
      })
    }

    // Validate request
    const validation = validateRequest(req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    const { messages, profile, dailyLog, imageUrl }: ChatRequest = req.body

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OpenAI API key not configured')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey })

    // Build personalized context from profile and daily log
    let context = ''
    if (profile) {
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
      context += `\n`
      
      // Personalized targets
      context += `**Your Personalized Targets:**\n`
      context += `- Daily Calorie Target: ${profile.calorie_target || 2000} calories\n`
      context += `- Daily Protein Target: ${profile.protein_target || 150}g\n`
      context += `- Daily Water Goal: ${profile.water_goal || 2000}ml\n`
      context += `\n`
    }
    
    if (dailyLog) {
      const calorieProgress = profile?.calorie_target ? Math.round((dailyLog.calories_consumed / profile.calorie_target) * 100) : 0
      const proteinProgress = profile?.protein_target ? Math.round((dailyLog.protein / profile.protein_target) * 100) : 0
      const waterProgress = profile?.water_goal ? Math.round((dailyLog.water_intake / profile.water_goal) * 100) : 0
      
      context += `**Today's Progress:**\n`
      context += `- Calories: ${dailyLog.calories_consumed} / ${profile?.calorie_target || 2000} cal (${calorieProgress}%)\n`
      context += `- Protein: ${dailyLog.protein}g / ${profile?.protein_target || 150}g (${proteinProgress}%)\n`
      context += `- Water: ${dailyLog.water_intake}ml / ${profile?.water_goal || 2000}ml (${waterProgress}%)\n`
      context += `- Calories Burned: ${dailyLog.calories_burned} cal\n`
      context += `\n`
    }

    // Prepare messages with system prompt
    const systemMessage = {
      role: 'system' as const,
      content: `You are a personalized AI health and fitness assistant for NutriScope. You understand each user's unique profile, goals, and preferences, and provide tailored advice accordingly.

${context}

**IMPORTANT - Personalization Guidelines:**
1. **Always reference the user's specific goals and targets** when giving advice
2. **Use their name** if available in the profile
3. **Consider their dietary preferences** when suggesting meals or recipes
4. **Reference their activity level** when discussing workouts or calorie needs
5. **Check their progress** against their personalized targets before making suggestions
6. **Give personalized recommendations** based on their specific situation, not generic advice
7. **Be encouraging** and reference their progress toward their goals

**Example Personalized Responses:**
- Instead of: "Aim for 150g protein"
- Say: "Since your goal is ${profile?.goal === 'gain_muscle' ? 'gaining muscle' : profile?.goal === 'lose_weight' ? 'losing weight' : profile?.goal} and your target is ${profile?.protein_target || 150}g protein, let's make sure you hit that today!"

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
- Extract individual items from user's request (e.g., "chicken breast, eggs, milk" → ["chicken breast", "eggs", "milk"])
- If user mentions quantities, include them in the item name (e.g., "2 eggs", "1 milk", "3 apples")
- ALWAYS include grocery_items as an array of strings in action.data
- Keep it simple - use natural quantities like "2 eggs", "1 milk", "3 apples" - no grams, kg, ml, etc.
- Example: { "action": { "type": "add_to_grocery_list", "data": { "grocery_items": ["2 chicken breast", "1 dozen eggs", "1 milk"] }, "requires_confirmation": true } }
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

    // Add image content if provided
    let imageContent: any[] = []
    if (imageUrl) {
      imageContent = [
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
      ]
    }

    // Prepare messages
    const openaiMessages: any[] = [systemMessage]
    for (const msg of messages) {
      if (msg.role === 'user' && imageContent.length > 0) {
        openaiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: typeof msg.content === 'string' ? msg.content : '' },
            ...imageContent,
          ],
        })
        imageContent = [] // Only add image to first user message
      } else {
        openaiMessages.push(msg)
      }
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const responseMessage = completion.choices[0]?.message?.content || ''

    // Try to parse JSON response
    let action = undefined
    let message = responseMessage
    
    try {
      // Try parsing as full JSON first
      const parsed = JSON.parse(responseMessage)
      if (parsed.action) {
        action = parsed.action
        message = parsed.message || responseMessage
      }
    } catch (e) {
      // Try extracting JSON action from text
      try {
        const jsonMatch = responseMessage.match(/\{[\s\S]*"action"[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.action) {
            action = parsed.action
            message = parsed.message || responseMessage.replace(jsonMatch[0], '').trim() || responseMessage
          }
        }
      } catch (e2) {
        // Not a JSON action, that's fine - return text response
      }
    }

    // Return response with rate limit headers
    return res.status(200).json({
      message,
      action,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
    })
  } catch (error: any) {
    console.error('Chat API error:', error)

    // Don't expose internal errors to client
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while processing your request. Please try again.',
    })
  }
}

