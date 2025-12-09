/**
 * Backend API Proxy for OpenAI Whisper Transcription
 * Vercel Serverless Function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

// Rate limiting storage
// NOTE: In-memory Map works fine for single-instance deployments (Vercel serverless functions)
// For multi-instance deployments, use Vercel KV or Redis
// See PRODUCTION_FIXES.md for upgrade instructions
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 10, // Lower limit for audio transcription
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    const resetTime = now + RATE_LIMIT.windowMs
    rateLimitStore.set(userId, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetTime }
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime }
  }

  userLimit.count++
  rateLimitStore.set(userId, userLimit)
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - userLimit.count,
    resetTime: userLimit.resetTime,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = req.headers['x-user-id'] as string || req.body.userId || 'anonymous'
    
    const rateLimit = checkRateLimit(userId)
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many transcription requests. Please try again later.',
        resetTime: rateLimit.resetTime,
      })
    }

    // Validate audio data
    if (!req.body.audio) {
      return res.status(400).json({ error: 'Audio data is required' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const openai = new OpenAI({ apiKey })

    // Convert base64 audio to buffer if needed
    let audioBuffer: Buffer
    if (typeof req.body.audio === 'string') {
      // Base64 encoded
      audioBuffer = Buffer.from(req.body.audio, 'base64')
    } else {
      return res.status(400).json({ error: 'Invalid audio format' })
    }

    // Validate file size (max 25MB for Whisper)
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'Audio file too large (max 25MB)' })
    }

    // Create a File-like object for OpenAI
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })

    return res.status(200).json({
      text: transcription.text,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
    })
  } catch (error: any) {
    console.error('Transcription API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to transcribe audio. Please try again.',
    })
  }
}

