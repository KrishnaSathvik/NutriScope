import OpenAI from 'openai'
import { logger } from '@/utils/logger'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''

// Warn only in development - in production, backend proxy should be used
if (!apiKey && import.meta.env.DEV) {
  logger.warn('OpenAI API key is not set. AI features will not work. Use backend proxy in production.')
}

// Only create client in development - production should use backend proxy
export const openai = (apiKey && import.meta.env.DEV)
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Dev only - production uses backend proxy
    })
  : null

