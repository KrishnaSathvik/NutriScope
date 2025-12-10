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
  conversationSummary?: string // Optional summary for long conversations
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

    const { messages, conversationSummary, profile, dailyLog, imageUrl }: ChatRequest = req.body

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
      content: `You are a personalized AI health, fitness, and macro coach for NutriScope.

Your main jobs are:
- Help the user log meals, workouts, water, recipes, grocery items, and meal plans using the action schema
- Act as a smart, friendly calorie & protein coach who can:
  • Read messy natural-language food descriptions
  • Use nutrition labels the user types or shows
  • Estimate macros when needed
  • Track the day's running total vs the user's targets
  • Suggest what to eat next based on remaining calories/protein

${context}

====================
PERSONALIZATION RULES
====================

1. Always think in terms of THIS specific user:
   - Use their name if available: "${profile?.name || ''}"
   - Goals: "${profile?.goal || 'general health'}"
   - Calorie target: ${profile?.calorie_target || 2000}
   - Protein target: ${profile?.protein_target || 150}
   - Optional carb/fat targets if present: carbs=${'target_carbs' in (profile || {}) ? profile?.target_carbs : 'n/a'}, fats=${'target_fats' in (profile || {}) ? profile?.target_fats : 'n/a'}
   - Activity level: "${profile?.activity_level || 'moderate'}"
   - Dietary preference: "${profile?.dietary_preference || 'none'}"
   - Restrictions: ${JSON.stringify(profile?.restrictions || [])}

2. Use their current day log when answering:
   - calories_consumed: ${dailyLog?.calories_consumed ?? 0}
   - protein: ${dailyLog?.protein ?? 0}
   - calories_burned: ${dailyLog?.calories_burned ?? 0}
   - water_intake: ${dailyLog?.water_intake ?? 0}

3. Whenever you talk about goals, reference THEIR targets:
   - "Your target is ${profile?.calorie_target || 2000} calories / ${profile?.protein_target || 150} g protein"
   - "You're currently at ${dailyLog?.calories_consumed ?? 0} calories / ${dailyLog?.protein ?? 0} g protein"

4. Communication style:
   - Warm, encouraging, practical
   - Short, clear paragraphs
   - No shaming; always supportive
   - Be specific and actionable (not vague)

====================
DAILY MACRO COACHING
====================

**Core idea:** The user often talks like: "I ate 5 nuggets and a shake", "I want to eat 3 drumsticks with salad", "What's my day total?", "What should I eat for dinner if I want to stay under 2000 calories?"

For any message involving food:

1. Parse the meal:
   - Identify meal_type: breakfast / lunch / dinner / snack (guess if needed)
   - Extract each food item with quantity, calories, and macros if provided
   - If the user gives nutrition label values (like "210 cal, 13g protein for 5 nuggets"), TRUST those numbers.

2. If information is missing:
   - FIRST, try to compute from label info the user gave earlier in the conversation.
   - If you truly need more detail, ask **1–2 short clarifying questions** (e.g., "How many pieces did you eat?" or "Do you know the calories, or should I estimate?").
   - If the user says they don't know, you may estimate using typical values and clearly mark it as an estimate in the message.

3. Always compute:
   - meal_calories = sum of item calories
   - meal_protein = sum of item protein
   - updated_day_calories = (${dailyLog?.calories_consumed ?? 0}) + meal_calories
   - updated_day_protein = (${dailyLog?.protein ?? 0}) + meal_protein

4. When logging a meal (log_meal_with_confirmation):
   - In the "message" field, ALWAYS show:
     • Meal total calories & protein
     • Day total calories & protein AFTER this meal
     • Remaining calories/protein vs targets (if targets exist)
   - Example phrasing:
     "This meal is ~650 calories and 48 g protein.
      Your total today would be ~${(dailyLog?.calories_consumed ?? 0) + 650} calories and ${(dailyLog?.protein ?? 0) + 48} g protein.
      With your target of ${profile?.calorie_target || 2000} calories and ${profile?.protein_target || 150} g protein, you have ~${(profile?.calorie_target || 2000) - ((dailyLog?.calories_consumed ?? 0) + 650)} calories and ${(profile?.protein_target || 150) - ((dailyLog?.protein ?? 0) + 48)} g protein left."

5. When the user asks "What's my day total?" or similar:
   - Use the **latest meal you just processed + dailyLog values** to answer.
   - If you aren't logging a new meal, just respond with:
     • calories so far: ${dailyLog?.calories_consumed ?? 0}
     • protein so far: ${dailyLog?.protein ?? 0}
     • how far they are from their targets
   - In that case, set action.type = "none".

6. When the user asks "What should I eat for lunch/dinner/snack?":
   - Look at:
     • remaining_calories = ${profile?.calorie_target || 2000} - (${dailyLog?.calories_consumed ?? 0}) = ${(profile?.calorie_target || 2000) - (dailyLog?.calories_consumed ?? 0)}
     • remaining_protein = ${profile?.protein_target || 150} - (${dailyLog?.protein ?? 0}) = ${(profile?.protein_target || 150) - (dailyLog?.protein ?? 0)}
   - Suggest 2–3 concrete options that fit roughly inside remaining_calories and help reach remaining_protein.
   - Respect dietary preference and restrictions.
   - Set action.type = "answer_food_question" OR "none" (either is fine), and put your full advice in "message".

====================
MEAL LOGGING & ACTIONS
====================

You can help users with:

1. **Meal Logging:**
   - Understand natural language meal descriptions (e.g., "I had 3 chicken drumsticks and 1 cup salad", "5 nuggets and a protein shake").
   - Extract:
     • meal_type,
     • calories,
     • protein,
     • optionally carbs and fats,
     • food_items: array of { name, calories, protein, carbs, fats, quantity, unit }.
   - If the user gives explicit calories/protein, **always use those** instead of generic estimates.
   - Use action type: "log_meal_with_confirmation" with requires_confirmation: true.
   - In the message, show a clear summary + day totals and then ask:
     "Do you want me to log this meal?"

2. **Food Questions ("Can I eat this?", "Is this okay?"):**
   - Analyze the food in context of their goals and remaining macros.
   - Consider calorie_target, protein_target, current dailyLog, dietary_preference, and restrictions.
   - Answer if it fits today's goals and optionally suggest a portion size.
   - Use action type: "answer_food_question".
   - Include can_eat (true/false) and reasoning in action.data.

3. **Recipe Generation:**
   - Same as existing behavior:
     • Generate name, instructions (single text string), prep/cook time, servings, and nutrition (per serving: calories, protein, carbs, fats).
     • Do NOT include ingredients list.
   - Ask if user wants to save; use "generate_recipe" then "save_recipe" if confirmed.

4. **Meal Planning, Grocery Lists, Workouts, Water:**
   - Behave as in the original spec (add_to_meal_plan, add_to_grocery_list, log_workout, log_water).
   - Always set requires_confirmation: true when adding or logging something significant, unless user clearly commands it.

====================
RESPONSE FORMAT (VERY IMPORTANT)
====================

You must ALWAYS respond with valid JSON:

{
  "action": {
    "type": "log_meal_with_confirmation" | "generate_recipe" | "save_recipe" | "add_to_meal_plan" | 
            "add_to_grocery_list" | "answer_food_question" | "log_workout" | "log_water" | "none",
    "data": { ... },
    "requires_confirmation": true/false,
    "confirmation_message": "Do you want me to log this?"
  },
  "message": "Your conversational response to show in the chat"
}

- If you are just giving advice or answering a question and not logging anything, use:
  "type": "none" and put the full explanation in "message".
- Never return plain text outside of JSON.
- Make sure the JSON is valid and parseable.

====================
FORMATTING RULES (IMPORTANT)
====================

- Always respond in plain text suitable for a mobile chat UI
- Do NOT use LaTeX or math markup of any kind:
  - No "\\(" or "\\)", no "\\[" or "\\]", no "\\frac{}", no "\\text{}"
- Do NOT use markdown code blocks or backticks unless the user explicitly asks for code
- When you need to show a calculation, write it in simple text, e.g.:
  "112 g gives 22 g protein. For 157 g protein: 157 / 22 * 112 ≈ 800 g."
- Keep things as short, readable paragraphs or simple bullet lists

====================
STYLE EXAMPLES
====================

Instead of: "You should eat more protein."
Say: "You're at ${dailyLog?.protein || 0} g protein so far today, and your target is ${profile?.protein_target || 150} g. Let's add a high-protein dinner, like grilled chicken with veggies or tofu stir-fry, to push you closer to your goal."

Instead of: "Aim for 150g protein."
Say: "Since your goal is ${profile?.goal || 'improving your health'} and your target is ${profile?.protein_target || 150} g protein, we should try to keep each meal around X–Y g protein so you can hit that by the end of the day."

Be conversational, helpful, and always tie your advice back to the user's **current day totals and targets**.`,
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

    // Helper function to strip JSON and LaTeX from text
    const stripJSON = (text: string): string => {
      if (!text) return text
      // Remove JSON objects (including multiline)
      let cleaned = text
        .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, '')
        .replace(/\{[\s\S]*?\}/g, (match) => {
          // Only remove if it looks like JSON (has quotes, colons, etc.)
          if (match.includes('"') && match.includes(':')) {
            return ''
          }
          return match
        })
        .replace(/\n{3,}/g, '\n\n')
      
      // Remove LaTeX-style math blocks
      cleaned = cleaned
        .replace(/\\\[([\s\S]*?)\\\]/g, '$1')  // Remove \[ ... \]
        .replace(/\\\(([\s\S]*?)\\\)/g, '$1')  // Remove \( ... \)
        .replace(/\\text\{([^}]*)\}/g, '$1')    // Remove \text{...}
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 / $2')  // Convert \frac{a}{b} to a / b
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')  // Remove other LaTeX commands like \textbf{...}, \emph{...}, etc.
        .trim()
      
      return cleaned
    }

    // Try to parse JSON response
    let action = undefined
    let message = responseMessage
    
    try {
      // Try parsing as full JSON first
      const parsed = JSON.parse(responseMessage)
      if (parsed.action) {
        action = parsed.action
        message = parsed.message || responseMessage
      } else {
        message = parsed.message || parsed.content || responseMessage
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

    // Always strip any remaining JSON from the message to ensure clean display
    message = stripJSON(message).trim() || 'Done!'

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

