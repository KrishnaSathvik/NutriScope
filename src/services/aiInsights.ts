import { openai } from '@/lib/openai'
import { DailyLog } from '@/types'
import { UserProfile } from '@/types'
import { buildPersonalizedContext } from '@/utils/aiContext'

/**
 * Generate inspirational/motivational coach tips for Dashboard (rotates 2-3 per day)
 */
export async function generateQuickTip(
  _dailyLog: DailyLog, // Kept for API compatibility but not used in backend proxy
  profile: UserProfile | null,
  tipIndex: number = 0, // 0, 1, or 2 for rotating tips
  userId?: string
): Promise<string> {
  // Use backend proxy if available (same logic as chat)
  const isProduction = import.meta.env.PROD
  // In development, only use backend proxy if explicitly enabled (for Vercel dev testing)
  // Otherwise, use direct OpenAI fallback
  const useBackendProxy = isProduction 
    ? import.meta.env.VITE_USE_BACKEND_PROXY !== 'false'
    : import.meta.env.VITE_USE_BACKEND_PROXY === 'true'
  
  // Debug logging
  console.log('[Coach Tip] useBackendProxy:', useBackendProxy, 'isProduction:', isProduction, 'userId:', userId)
  
  // Use backend proxy if enabled (works in both dev and prod)
  if (useBackendProxy) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/chat'
      console.log('[Coach Tip] Calling API:', apiUrl)
      
      const userName = profile?.name || 'you'
      const goalDescription = profile?.goal === 'lose_weight' ? 'losing weight' 
        : profile?.goal === 'gain_muscle' ? 'gaining muscle'
        : profile?.goal === 'maintain' ? 'maintaining your weight'
        : profile?.goal === 'improve_fitness' ? 'improving fitness'
        : 'your goals'
      
      // Determine time of day with more precision
      const hour = new Date().getHours()
      let timeOfDay: string
      let greeting: string
      if (hour >= 5 && hour < 12) {
        timeOfDay = 'morning'
        greeting = 'Good morning'
      } else if (hour >= 12 && hour < 17) {
        timeOfDay = 'afternoon'
        greeting = 'Good afternoon'
      } else if (hour >= 17 && hour < 22) {
        timeOfDay = 'evening'
        greeting = 'Good evening'
      } else {
        timeOfDay = 'night'
        greeting = 'Good night'
      }

      const tipThemes = [
        'motivation and encouragement',
        'mindset and perseverance',
        'celebrating small wins and progress',
      ]

      const prompt = `You are a motivational fitness and wellness coach for ${userName}. Generate an INSPIRATIONAL, MOTIVATIONAL message (1-2 sentences max) that encourages and uplifts them. This is tip #${tipIndex + 1} of 3 for today.

**Context:**
- User's name: ${userName}
- Their goal: ${goalDescription}
- Current time: ${hour}:00 (${timeOfDay})
- Appropriate greeting: ${greeting}
- Theme focus: ${tipThemes[tipIndex % tipThemes.length]}

**CRITICAL TIME-AWARENESS RULES:**
1. Current time is ${hour}:00, which is ${timeOfDay}
2. You MUST use time-appropriate language:
   - If it's ${timeOfDay}, NEVER say "good morning", "good afternoon", or "good evening" unless it matches the current time
   - If it's night (after 22:00 or before 5:00), use evening/night appropriate language
   - If it's morning (5:00-11:59), you can use morning greetings
   - If it's afternoon (12:00-16:59), use afternoon-appropriate language
   - If it's evening (17:00-21:59), use evening-appropriate language
3. DO NOT use greetings that don't match the time of day

**Guidelines:**
1. Keep it SHORT (1-2 sentences maximum)
2. Be INSPIRATIONAL and MOTIVATIONAL - focus on mindset, encouragement, and positivity
3. DO NOT mention specific nutrition numbers, calories, protein, meals, or workouts
4. DO NOT give actionable nutrition advice
5. Focus on motivation, mindset, perseverance, self-belief, or celebrating progress
6. Use ${userName}'s name naturally
7. Make it feel personal and encouraging
8. Vary the message style based on tipIndex (${tipIndex})
9. Be time-aware: Since it's ${timeOfDay}, use appropriate language for this time

Generate an inspirational, motivational message now:`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'x-user-id': userId }),
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a motivational fitness and wellness coach. You provide brief, inspirational messages (1-2 sentences max) that encourage and uplift users. Focus on mindset, motivation, and positivity. Do NOT mention specific nutrition data, calories, macros, meals, or workouts. CRITICAL: Always use time-appropriate greetings and language based on the current time of day provided in the user's message. Never say "good morning" at night or "good evening" in the morning.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          profile: profile ? {
            name: profile.name,
            goal: profile.goal,
            activity_level: profile.activity_level,
            dietary_preference: profile.dietary_preference,
          } : undefined,
          userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API returned ${response.status}`)
      }

      const data = await response.json()
      console.log('[Coach Tip] API Response:', data)
      // Extract message from response (could be in data.message or data.action.message)
      const message = data.message || data.action?.message || 'Unable to generate tip at this time.'
      console.log('[Coach Tip] Extracted message:', message)
      return message
    } catch (error) {
      console.error('[Coach Tip] Error generating quick tip via backend proxy:', error)
      console.error('[Coach Tip] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      // In production, don't fall back to direct OpenAI
      if (isProduction) {
        return 'Unable to generate tip. Please try again later.'
      }
      // In development, continue to fallback below
      console.log('[Coach Tip] Backend proxy failed in dev, falling back to direct OpenAI')
    }
  }
  
  // Fallback: use direct OpenAI if backend proxy is disabled or failed (dev only)
  console.log('[Coach Tip] Using direct OpenAI fallback')
  if (!openai) {
    console.log('[Coach Tip] OpenAI client not available')
    if (isProduction) {
      return 'AI tips are temporarily unavailable. Please try again later.'
    }
    return 'AI tips are not available. Please configure your OpenAI API key.'
  }

  try {
    const userName = profile?.name || 'you'
    const goalDescription = profile?.goal === 'lose_weight' ? 'losing weight' 
      : profile?.goal === 'gain_muscle' ? 'gaining muscle'
      : profile?.goal === 'maintain' ? 'maintaining your weight'
      : profile?.goal === 'improve_fitness' ? 'improving fitness'
      : 'your goals'
    
    // Determine time of day with more precision
    const hour = new Date().getHours()
    let timeOfDay: string
    let greeting: string
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning'
      greeting = 'Good morning'
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon'
      greeting = 'Good afternoon'
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening'
      greeting = 'Good evening'
    } else {
      timeOfDay = 'night'
      greeting = 'Good night'
    }

    const tipThemes = [
      'motivation and encouragement',
      'mindset and perseverance',
      'celebrating small wins and progress',
    ]

    const prompt = `You are a motivational fitness and wellness coach for ${userName}. Generate an INSPIRATIONAL, MOTIVATIONAL message (1-2 sentences max) that encourages and uplifts them. This is tip #${tipIndex + 1} of 3 for today.

**Context:**
- User's name: ${userName}
- Their goal: ${goalDescription}
- Current time: ${hour}:00 (${timeOfDay})
- Appropriate greeting: ${greeting}
- Theme focus: ${tipThemes[tipIndex % tipThemes.length]}

**CRITICAL TIME-AWARENESS RULES:**
1. Current time is ${hour}:00, which is ${timeOfDay}
2. You MUST use time-appropriate language:
   - If it's ${timeOfDay}, NEVER say "good morning", "good afternoon", or "good evening" unless it matches the current time
   - If it's night (after 22:00 or before 5:00), use evening/night appropriate language
   - If it's morning (5:00-11:59), you can use morning greetings
   - If it's afternoon (12:00-16:59), use afternoon-appropriate language
   - If it's evening (17:00-21:59), use evening-appropriate language
3. DO NOT use greetings that don't match the time of day

**Guidelines:**
1. Keep it SHORT (1-2 sentences maximum)
2. Be INSPIRATIONAL and MOTIVATIONAL - focus on mindset, encouragement, and positivity
3. DO NOT mention specific nutrition numbers, calories, protein, meals, or workouts
4. DO NOT give actionable nutrition advice
5. Focus on motivation, mindset, perseverance, self-belief, or celebrating progress
6. Use ${userName}'s name naturally
7. Make it feel personal and encouraging
8. Vary the message style based on tipIndex (${tipIndex})
9. Be time-aware: Since it's ${timeOfDay}, use appropriate language for this time

**Examples of good inspirational tips (time-appropriate):**
- Morning: "${userName}, every small step you take today brings you closer to your goals. Trust the process and believe in yourself."
- Afternoon: "Progress isn't always linear, but your commitment to showing up every day is what truly matters. Keep going!"
- Evening/Night: "Remember why you started this journey. You're stronger than you think, and every day is a new opportunity to grow."

**What NOT to do:**
- Don't say: "You're at 45% of your protein target, add more protein"
- Don't say: "You've logged 2 meals, log more meals"
- Don't mention calories, macros, meals, workouts, or specific numbers
- Don't say "good morning" at night or "good evening" in the morning

Generate an inspirational, motivational message now:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a motivational fitness and wellness coach. You provide brief, inspirational messages (1-2 sentences max) that encourage and uplift users. Focus on mindset, motivation, and positivity. Do NOT mention specific nutrition data, calories, macros, meals, or workouts. CRITICAL: Always use time-appropriate greetings and language based on the current time of day provided in the user's message. Never say "good morning" at night or "good evening" in the morning.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 100, // Shorter for quick tips
      temperature: 0.9, // Higher temperature for more variety
    })

    return completion.choices[0]?.message?.content || 'Unable to generate tip at this time.'
  } catch (error) {
    console.error('Error generating quick tip:', error)
    return 'Unable to generate tip. Please try again later.'
  }
}

/**
 * Generate comprehensive daily insights for SummaryPage (longer, detailed analysis)
 */
export async function generateDailyInsights(
  dailyLog: DailyLog,
  profile: UserProfile | null,
  userId?: string
): Promise<string> {
  // Use backend proxy if available (same logic as chat and coach tip)
  const isProduction = import.meta.env.PROD
  // In development, only use backend proxy if explicitly enabled (for Vercel dev testing)
  // Otherwise, use direct OpenAI fallback
  const useBackendProxy = isProduction 
    ? import.meta.env.VITE_USE_BACKEND_PROXY !== 'false'
    : import.meta.env.VITE_USE_BACKEND_PROXY === 'true'
  
  // Use backend proxy if enabled (works in both dev and prod)
  if (useBackendProxy) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/chat'
      
      // Build comprehensive personalized context using shared helper
      const personalizedContext = buildPersonalizedContext(profile, dailyLog, { mode: 'insight' })
      
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

Provide your personalized insight now:`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'x-user-id': userId }),
        },
        body: JSON.stringify({
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
          } : undefined,
          dailyLog: {
            calories_consumed: dailyLog.calories_consumed,
            protein: dailyLog.protein,
            calories_burned: dailyLog.calories_burned,
            water_intake: dailyLog.water_intake,
            alcohol_drinks: dailyLog.alcohol_drinks || 0,
            meals: dailyLog.meals.slice(0, 5),
            exercises: dailyLog.exercises.slice(0, 3),
            alcohol_logs: dailyLog.alcohol_logs?.slice(0, 3) || [],
          },
          userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API returned ${response.status}`)
      }

      const data = await response.json()
      // Extract message from response
      const message = data.message || data.action?.message || 'Unable to generate insights at this time.'
      return message
    } catch (error) {
      console.error('[Daily Insights] Error generating insights via backend proxy:', error)
      // In production, don't fall back to direct OpenAI
      if (isProduction) {
        return 'Unable to generate insights. Please try again later.'
      }
      // In development, continue to fallback below
      console.log('[Daily Insights] Backend proxy failed in dev, falling back to direct OpenAI')
    }
  }
  
  // Fallback: use direct OpenAI if backend proxy is disabled or failed (dev only)
  console.log('[Daily Insights] Using direct OpenAI fallback')
  if (!openai) {
    if (isProduction) {
      return 'AI insights are temporarily unavailable. Please try again later.'
    }
    return 'AI insights are not available. Please configure your OpenAI API key.'
  }

  try {
    // Build comprehensive personalized context using shared helper
    const personalizedContext = buildPersonalizedContext(profile, dailyLog, { mode: 'insight' })
    
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
