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
    gender?: 'male' | 'female'
    calorie_target?: number
    protein_target?: number
    water_goal?: number
    goal?: string
    goals?: string[] // Array of goals for multi-selection
    activity_level?: string
    dietary_preference?: string
    restrictions?: string[]
    target_carbs?: number
    target_fats?: number
    target_weight?: number // Target weight in kg
    timeframe_months?: number // Timeframe in months to reach target weight
  }
  dailyLog?: {
    calories_consumed?: number
    protein?: number
    calories_burned?: number
    water_intake?: number
    meals?: Array<{
      id?: string
      meal_id?: string
      meal_type?: string
      calories?: number
      protein?: number
      carbs?: number
      fats?: number
      name?: string
      meal_description?: string
      food_items?: Array<{
        name?: string
        calories?: number
        protein?: number
        carbs?: number
        fats?: number
        quantity?: number
        unit?: string
      }>
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
    // conversationSummary is available but not currently used in the system prompt

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
    
    // Add meal context for carb/fat calculation
    if (dailyLog?.meals && dailyLog.meals.length > 0) {
      context += `**Today's Meals - USE THESE EXACT meal_id VALUES WHEN UPDATING:**\n`
      dailyLog.meals.forEach((meal, i) => {
        const mealId = meal.id || meal.meal_id
        context += `Meal ${i + 1}:\n`
        context += `  meal_id: "${mealId}" ← USE THIS EXACT VALUE\n`
        context += `  meal_type: "${meal.meal_type || 'meal'}"\n`
        if (meal.name || meal.meal_description) context += `  name: "${meal.name || meal.meal_description}"\n`
        context += `  calories: ${meal.calories || 0}, protein: ${meal.protein || 0}g`
        if (meal.carbs !== undefined && meal.carbs !== null) context += `, carbs: ${meal.carbs}g`
        if (meal.fats !== undefined && meal.fats !== null) context += `, fats: ${meal.fats}g`
        context += `\n`
        if (meal.food_items && meal.food_items.length > 0) {
          context += `  food_items: ${meal.food_items.map((f: any) => f.name).join(', ')}\n`
        }
        context += `\n`
      })
      context += `**CRITICAL RULES FOR UPDATING MEALS:**\n`
      context += `1. ALWAYS use the exact meal_id from the "meal_id" field above (e.g., "${dailyLog.meals[0]?.id || dailyLog.meals[0]?.meal_id || 'uuid-here'}").\n`
      context += `2. NEVER use array indices like "1", "2", "3" as meal_id - those are NOT valid meal IDs.\n`
      context += `3. meal_id is a UUID string (looks like "abc123-def456-ghi789-..."), NOT a number.\n`
      context += `4. Copy the meal_id EXACTLY as shown above - do not modify it.\n\n`
    }
    
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
      
      context += `**Your Goals & Preferences:**\n`
      if (userGoals.length > 1) {
        context += `- Goals: ${goalLabels}\n`
        context += `- Primary Goal (for backward compatibility): ${goalDescriptions[profile.goal || 'maintain'] || profile.goal || 'maintain'}\n`
      } else {
        context += `- Primary Goal: ${goalLabels}\n`
      }
      if (profile.gender) context += `- Gender: ${profile.gender}\n`
      context += `- Activity Level: ${activityDescriptions[profile.activity_level || 'moderate'] || profile.activity_level || 'moderate'}\n`
      context += `- Dietary Preference: ${dietaryDescriptions[profile.dietary_preference || 'flexitarian'] || profile.dietary_preference || 'flexitarian'}\n`
      
      // Include target weight and timeframe if available
      if (profile.target_weight && profile.timeframe_months) {
        context += `- Target Weight: ${profile.target_weight}kg (in ${profile.timeframe_months} month${profile.timeframe_months > 1 ? 's' : ''})\n`
      }
      context += `\n`
      
      // Personalized targets
      context += `**Your Personalized Targets:**\n`
      context += `- Daily Calorie Target: ${profile.calorie_target || 2000} calories\n`
      context += `- Daily Protein Target: ${profile.protein_target || 150}g\n`
      context += `- Daily Water Goal: ${profile.water_goal || 2000}ml\n`
      context += `\n`
    }
    
    if (dailyLog) {
      const caloriesConsumed = dailyLog.calories_consumed ?? 0
      const protein = dailyLog.protein ?? 0
      const waterIntake = dailyLog.water_intake ?? 0
      const caloriesBurned = dailyLog.calories_burned ?? 0
      
      const calorieProgress = profile?.calorie_target ? Math.round((caloriesConsumed / profile.calorie_target) * 100) : 0
      const proteinProgress = profile?.protein_target ? Math.round((protein / profile.protein_target) * 100) : 0
      const waterProgress = profile?.water_goal ? Math.round((waterIntake / profile.water_goal) * 100) : 0
      
      context += `**Today's Progress:**\n`
      context += `- Calories: ${caloriesConsumed} / ${profile?.calorie_target || 2000} cal (${calorieProgress}%)\n`
      context += `- Protein: ${protein}g / ${profile?.protein_target || 150}g (${proteinProgress}%)\n`
      context += `- Water: ${waterIntake}ml / ${profile?.water_goal || 2000}ml (${waterProgress}%)\n`
      context += `- Calories Burned: ${caloriesBurned} cal\n`
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
   - Sex: ${profile?.gender || 'not specified'} (used for BMR calculation and personalized recommendations)
   - Goals: ${(profile as any)?.goals && (profile as any).goals.length > 0 ? JSON.stringify((profile as any).goals) : `"${profile?.goal || 'general health'}"`}
   - Primary Goal (backward compatibility): "${profile?.goal || 'general health'}"
   - Current Weight: ${profile?.weight || 'not specified'}kg
   - Target Weight: ${(profile as any)?.target_weight ? `${(profile as any).target_weight}kg` : 'not specified'}${(profile as any)?.timeframe_months ? ` (in ${(profile as any).timeframe_months} month${(profile as any).timeframe_months > 1 ? 's' : ''})` : ''}
   - Calorie target: ${profile?.calorie_target || 2000} cal/day (calculated based on goals, target weight, and timeframe)
   - Protein target: ${profile?.protein_target || 150}g/day (calculated based on goals and activity level)
   - Water goal: ${profile?.water_goal || 2000}ml/day (calculated based on weight, activity level, and goals)
   - Optional carb/fat targets if present: carbs=${'target_carbs' in (profile || {}) ? profile?.target_carbs : 'n/a'}, fats=${'target_fats' in (profile || {}) ? profile?.target_fats : 'n/a'}
   - Activity level: "${profile?.activity_level || 'moderate'}"
   - Dietary preference: "${profile?.dietary_preference || 'none'}"
   - Restrictions: ${JSON.stringify(profile?.restrictions || [])}
   
   Note: Gender-specific considerations:
   - ${profile?.gender === 'male' ? 'Male users typically have higher BMR and may need slightly more calories/protein for muscle building' : profile?.gender === 'female' ? 'Female users may have different nutritional needs, especially regarding iron, calcium, and protein distribution throughout the day' : 'Consider gender-specific nutritional needs when making recommendations'}

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
   - IMPORTANT: meal_type must be one of: 'breakfast', 'lunch', 'dinner', 'morning_snack', 'evening_snack', 'pre_breakfast', 'post_dinner'
   - For snacks, ALWAYS use 'morning_snack' or 'evening_snack' - NEVER just 'snack'
   - If user says "evening snack" or mentions "evening" in context, use 'evening_snack'
   - If user says "morning snack" or mentions "morning" in context, use 'morning_snack'
   - If user just says "snack" without context, use 'morning_snack' as default
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
   - **CRITICAL: Check dailyLog.meals FIRST** - If a meal already exists for the meal_type (breakfast, lunch, dinner, etc.), you MUST use "update_meal" or "update_meals", NOT "log_meal"
   - **For NEW meals** (meal_type doesn't exist in dailyLog.meals): Use action type "log_meal_with_confirmation" or "log_meal"
   - **For UPDATING a SINGLE existing meal**: Use action type "update_meal" with meal_id in action.data
     • If user says "update my lunch", "change my breakfast to...", "fix my dinner", "edit my meal", "calculate carbs and fats", "add carbs and fats", or mentions a specific meal they already logged
     • Find the meal_id from dailyLog.meals array by matching meal_type
     • **CRITICAL: meal_id MUST be the exact UUID string from dailyLog.meals[].id (e.g., "abc123-def456-...") - NEVER use numbers like "1" or "0"**
     • Include meal_id: The ID of the meal to update (use the "id" field from dailyLog.meals)
     • **CRITICAL: When user asks to calculate/add carbs/fats for existing meals:**
       - Look at the meal's existing data: name, meal_description, food_items, calories, protein
       - Calculate missing carbs and fats based on the meal description/food items
       - Use nutrition knowledge: estimate carbs for grains/vegetables/fruits, estimate fats for oils/nuts/meats
       - If meal has food_items array, sum up carbs/fats from individual items
       - If only meal name/description exists, estimate based on food type
       - Always include calculated carbs and fats in the update action
     • Include only the fields that need to be updated (meal_type, meal_description, calories, protein, carbs, fats, food_items)
     • Set requires_confirmation: false (single updates don't need confirmation)
   - **For UPDATING MULTIPLE meals (2+)**: Use action type "update_meals" with meals array in action.data
     • If user says "update my breakfast and lunch", "change all my meals", "fix my breakfast, lunch, and dinner", "calculate carbs and fats", "update meals with carbs and fat", or asks to update/add nutrition for multiple meals
     • **CRITICAL: Include ALL meals from dailyLog.meals that need updating** - don't skip any meals
     • **CRITICAL: meal_id MUST be copied EXACTLY from the "meal_id" field shown in the meal context above**
     • **NEVER use array indices (1, 2, 3) or numbers as meal_id - meal_id is always a UUID string**
     • **Example: If meal context shows "meal_id: 'abc-123-def-456'", use exactly that string, NOT "1" or "2"**
     • Include meals: Array of { meal_id: <exact UUID from context>, meal_type, carbs, fats, ...other updates } for EACH meal to update
     • Set requires_confirmation: true and show summary of which meals will be updated
     • In confirmation_message, list ALL meals with their calculated values: "I'll update: Breakfast (X cal, Yg protein, Zg carbs, Wg fats), Lunch (...), Dinner (...)"
     • In your message, clearly state which meals you found and what values you calculated for each
   - Extract:
     • meal_type: MUST be one of these exact values: 'breakfast', 'lunch', 'dinner', 'morning_snack', 'evening_snack', 'pre_breakfast', 'post_dinner'
     • For snacks, ALWAYS use 'morning_snack' or 'evening_snack' - NEVER just 'snack'
     • CRITICAL: If user says "evening snack", "for evening snack", "as evening snack", or ANY mention of "evening" with snack, you MUST use 'evening_snack'
     • If user says "morning snack" or mentions "morning" in context, use 'morning_snack'
     • If user just says "snack" without any time context, use 'morning_snack' as default
     • Examples:
       - "evening snack" → 'evening_snack'
       - "for evening snack" → 'evening_snack'
       - "as evening snack" → 'evening_snack'
       - "snack for evening" → 'evening_snack'
       - "morning snack" → 'morning_snack'
       - just "snack" → 'morning_snack'
     • meal_description: **REQUIRED** - Generate a SHORT, descriptive name for the meal (2-5 words max)
       - Examples: "Chicken Drumsticks with Salad", "Protein Shake", "Pomegranate", "Oatmeal with Berries", "Grilled Salmon", "Chicken Nuggets"
       - Use the main food items mentioned by the user
       - Keep it concise and clear
       - **CRITICAL: You MUST always include meal_description in action.data - it is REQUIRED, not optional**
     • calories,
     • protein,
     • carbs (ALWAYS include - estimate if not provided, use 0 for pure protein foods),
     • fats (ALWAYS include - estimate if not provided),
     • food_items: array of { name, calories, protein, carbs, fats, quantity, unit }.
   - **CRITICAL RULE: meal_description is MANDATORY** - Always generate and include a meal_description in action.data when logging meals. Never omit it.
   - **CRITICAL RULE: Always calculate carbs and fats** - Even if user doesn't mention them, estimate based on food type. Use 0 for pure protein foods (chicken, fish), estimate carbs for grains/vegetables, estimate fats for nuts/oils.
   - **CRITICAL RULE: When updating meals to add carbs/fats** - If user asks to "calculate carbs and fats", "add carbs and fats", "update meals with carbs and fat", "calculate for all meals", or similar requests:
     • **MANDATORY: Check dailyLog.meals array - it contains ALL meals logged today**
     • **If 2+ meals exist**: Use action type "update_meals" and include ALL meals from dailyLog.meals (don't skip any!)
     • **If only 1 meal exists**: Use action type "update_meal" with that meal's meal_id
     • **For EACH meal in dailyLog.meals**, you MUST:
       - Use the meal's existing data: id (as meal_id), name, meal_description, food_items, calories, protein
       - If carbs/fats are missing or null, calculate them based on:
         * food_items array (if exists): sum carbs/fats from individual items
         * meal name/description: estimate based on food type
         * calories and protein: use nutrition ratios (if meal has calories but no carbs/fats, estimate based on food type)
       - Use nutrition knowledge: grains/vegetables/fruits = carbs, oils/nuts/meats/dairy = fats
       - **NEVER set carbs/fats to 0 unless the meal truly has none** (e.g., plain water, black coffee)
       - If a meal shows 0 calories/protein, it might be incomplete - still try to estimate carbs/fats if meal name suggests food
     • Include calculated carbs and fats in the update action - DO NOT ask the user for these values
     • In your message, list ALL meals you found and their calculated values: "I found X meals. I'll update: Breakfast (Y cal, Zg protein, Ag carbs, Bg fats), Lunch (...), Dinner (...)"
     • In confirmation_message, clearly list each meal: "I'll update your breakfast (Ag carbs, Bg fats), lunch (Cg carbs, Dg fats), and dinner (Eg carbs, Fg fats). Continue?"
   - If the user gives explicit calories/protein, **always use those** and estimate carbs/fats based on the food type.
   - **Direct Logging**: If user explicitly says "log this", "add this meal", "save this meal", "log it", "I ate [food] for [meal]", or uses direct commands, set requires_confirmation: false and log immediately
   - Otherwise, use action type: "log_meal_with_confirmation" with requires_confirmation: true.
   - In the message, show a clear summary + day totals and then ask:
     "Do you want me to log this meal?" (only if requires_confirmation: true)

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
   - **Direct Saving**: If user explicitly says "add to my recipes", "save to my recipes", "add this recipe", "save this recipe", "add [recipe name] to my recipes", "add [recipe name] to recipe", or uses direct commands, use action type "save_recipe" with requires_confirmation: false and save immediately.
   - **Generate & Ask**: If user asks to generate a recipe or asks "can you create a recipe for...", use action type "generate_recipe" with requires_confirmation: true, then use "save_recipe" if confirmed.
   - **User Provides Recipe**: If user says "I have this recipe" or provides recipe details directly, use action type "save_recipe" with requires_confirmation: false and save immediately.
   - **Confirmation Responses**: If the user says "yes", "yep", "sure", "ok", "okay", "save it", "add it", or similar affirmative responses after you've generated a recipe (generate_recipe action), automatically convert to "save_recipe" action with requires_confirmation: false and save immediately.

4. **Meal Planning, Grocery Lists, Workouts, Water:**
   - For workouts: If user explicitly says "log my workout", "I ran for 30 minutes", "add workout", set requires_confirmation: false and log directly
   - For meal plans: If user explicitly says "add to meal plan", "save to meal plan", set requires_confirmation: false and add directly
   - For grocery lists: If user explicitly says "add to grocery list", "add to shopping list", set requires_confirmation: false and add directly
   - For water: If user explicitly says "I drank water", "log water", set requires_confirmation: false and log directly
   - Only set requires_confirmation: true if the user's intent is unclear or they're asking a question about it

====================
RESPONSE FORMAT (VERY IMPORTANT)
====================

You must ALWAYS respond with valid JSON:

{
  "action": {
    "type": "log_meal_with_confirmation" | "update_meal" | "update_meals" | "generate_recipe" | "save_recipe" | "add_to_meal_plan" | 
            "add_to_grocery_list" | "answer_food_question" | "log_workout" | "log_water" | "none",
    "data": { ... },
    "requires_confirmation": true/false,
    "confirmation_message": "Do you want me to log this?"
  },
  "message": "Your conversational response to show in the chat"
}

**For log_meal_with_confirmation, action.data MUST include:**
- meal_type: "breakfast" | "lunch" | "dinner" | "morning_snack" | "evening_snack" | "pre_breakfast" | "post_dinner"
- meal_description: **REQUIRED** - A short descriptive name (2-5 words)
- calories: number
- protein: number
- carbs: number (optional)
- fats: number (optional)
- food_items: array (optional)

**Example log_meal_with_confirmation response:**
{
  "action": {
    "type": "log_meal_with_confirmation",
    "data": {
      "meal_type": "lunch",
      "meal_description": "Chicken Drumsticks with Salad",
      "calories": 650,
      "protein": 48,
      "carbs": 25,
      "fats": 12,
      "food_items": [...]
    },
    "requires_confirmation": true,
    "confirmation_message": "Do you want me to log this meal?"
  },
  "message": "This meal is ~650 calories and 48g protein..."
}

**Example update_meal (single meal) response:**
{
  "action": {
    "type": "update_meal",
    "data": {
      "meal_id": "abc123",
      "calories": 500,
      "protein": 40,
      "carbs": 45,
      "fats": 15
    },
    "requires_confirmation": false
  },
  "message": "I've updated your lunch to 500 calories, 40g protein, 45g carbs, and 15g fats."
}

**Example update_meal (calculating carbs/fats from existing meal):**
{
  "action": {
    "type": "update_meal",
    "data": {
      "meal_id": "abc123",
      "carbs": 50,
      "fats": 20
    },
    "requires_confirmation": false
  },
  "message": "I've calculated and added carbs (50g) and fats (20g) to your lunch based on the meal contents."
}

**Example update_meals (calculating carbs/fats for all meals) response:**
{
  "action": {
    "type": "update_meals",
    "data": {
      "meals": [
        {
          "meal_id": "abc-123-def-456-ghi-789",
          "meal_type": "breakfast",
          "carbs": 45,
          "fats": 12
        },
        {
          "meal_id": "def-456-ghi-789-jkl-012",
          "meal_type": "lunch",
          "carbs": 50,
          "fats": 15
        },
        {
          "meal_id": "ghi-789-jkl-012-mno-345",
          "meal_type": "dinner",
          "carbs": 40,
          "fats": 18
        }
      ]
    },
    "requires_confirmation": true,
    "confirmation_message": "I'll update your breakfast (45g carbs, 12g fats), lunch (50g carbs, 15g fats), and dinner (40g carbs, 18g fats). Continue?"
  },
  "message": "I found 3 meals in your log. I've calculated carbs and fats for each:\n- Breakfast: 45g carbs, 12g fats\n- Lunch: 50g carbs, 15g fats\n- Dinner: 40g carbs, 18g fats\n\nWould you like me to update all of them?"
}

**CRITICAL: In the examples above, meal_id values like "abc-123-def-456-ghi-789" are UUIDs. You MUST use the EXACT meal_id from the meal context provided, NOT array indices like "1", "2", "3".**

**Example update_meals (multiple meals with full nutrition) response:**
{
  "action": {
    "type": "update_meals",
    "data": {
      "meals": [
        {
          "meal_id": "abc123",
          "meal_type": "breakfast",
          "calories": 400,
          "protein": 30,
          "carbs": 45,
          "fats": 12
        },
        {
          "meal_id": "def456",
          "meal_type": "lunch",
          "calories": 600,
          "protein": 50,
          "carbs": 50,
          "fats": 15
        }
      ]
    },
    "requires_confirmation": true,
    "confirmation_message": "I'll update your breakfast (400 cal, 30g protein, 45g carbs, 12g fats) and lunch (600 cal, 50g protein, 50g carbs, 15g fats). Continue?"
  },
  "message": "I found 2 meals to update. Here's what will change..."
}

- If you are just giving advice or answering a question and not logging anything, use:
  "type": "none" and put the full explanation in "message".
- Never return plain text outside of JSON.
- Make sure the JSON is valid and parseable.
- **CRITICAL: meal_description is MANDATORY for all meal logging actions - never omit it.**

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
    let imageAdded = false
    for (const msg of messages) {
      if (msg.role === 'user') {
        // Check if message already has image content
        const hasImageInContent = Array.isArray(msg.content) && msg.content.some((item: any) => item.type === 'image_url')
        
        if (imageContent.length > 0 && !imageAdded && !hasImageInContent) {
          // Add image to first user message that doesn't already have one
          let textContent = ''
          if (typeof msg.content === 'string') {
            textContent = msg.content
          } else if (Array.isArray(msg.content)) {
            const textItem = msg.content.find((item: any) => item.type === 'text')
            textContent = (textItem && 'text' in textItem) ? String(textItem.text) : ''
          }
          
          openaiMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: textContent },
              ...imageContent,
            ],
          })
          imageContent = [] // Only add image to first user message
          imageAdded = true
        } else {
          // Message already has image or we've already added image
          openaiMessages.push(msg)
        }
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

