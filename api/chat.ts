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
    calorie_target?: number
    protein_target?: number
    goal?: string
  }
  dailyLog?: {
    calories_consumed?: number
    protein?: number
    calories_burned?: number
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

    // Build context from profile and daily log
    let context = ''
    if (profile) {
      context += `User's calorie target: ${profile.calorie_target || 2000} cal/day. `
      context += `Protein target: ${profile.protein_target || 150}g/day. `
      if (profile.goal) {
        context += `Goal: ${profile.goal}. `
      }
    }
    if (dailyLog) {
      context += `Today's progress: ${dailyLog.calories_consumed || 0} cal consumed, `
      context += `${dailyLog.protein || 0}g protein, `
      context += `${dailyLog.calories_burned || 0} cal burned. `
    }

    // Prepare messages with system prompt
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI health and fitness assistant for NutriScope. ${context}

You can help users:
1. Log meals by understanding their descriptions
2. Log workouts
3. Log water intake
4. Answer nutrition and fitness questions
5. Provide personalized insights based on their data

When the user wants to log something, respond with a JSON action in this format:
{
  "action": {
    "type": "log_meal" | "log_workout" | "log_water",
    "data": { ... }
  }
}

Otherwise, provide a helpful text response.`,
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

    // Try to parse JSON action from response
    let action = undefined
    try {
      const jsonMatch = responseMessage.match(/\{[\s\S]*"action"[\s\S]*\}/)
      if (jsonMatch) {
        action = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      // Not a JSON action, that's fine
    }

    // Return response with rate limit headers
    return res.status(200).json({
      message: responseMessage,
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

