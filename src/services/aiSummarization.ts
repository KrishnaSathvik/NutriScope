import { openai } from '@/lib/openai'
import { ChatMessage } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Generate a summary of a conversation for use in long chat histories
 * This reduces token usage by summarizing old messages instead of sending them all
 */
export async function summarizeConversation(messages: ChatMessage[]): Promise<string | null> {
  // Only summarize if we have enough messages (10+)
  if (messages.length < 10) {
    return null
  }

  // In production, use backend proxy if available
  const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false'
  const isProduction = import.meta.env.PROD
  
  if (!openai && !useBackendProxy) {
    if (isProduction) {
      return null // Fail silently in production if no OpenAI
    }
    return null
  }
  
  if (isProduction && !openai) {
    return null
  }
  
  if (!openai) {
    return null
  }

  try {
    // Extract conversation content (exclude system messages and actions)
    const conversationText = messages
      .filter(m => m.role !== 'assistant' || !m.action) // Exclude action messages
      .slice(0, -5) // Exclude last 5 messages (keep them fresh)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    if (conversationText.length < 200) {
      return null // Too short to summarize
    }

    const prompt = `Summarize this conversation in 2-3 sentences. Focus on:
- Main topics discussed
- Key decisions or actions taken
- User's goals or concerns mentioned

Conversation:
${conversationText}

Summary:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries of conversations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3, // Lower temperature for more consistent summaries
    })

    const summary = completion.choices[0]?.message?.content?.trim() || null
    
    if (summary) {
      logger.info('Generated conversation summary', { length: summary.length })
    }
    
    return summary
  } catch (error) {
    logger.error('Error generating conversation summary:', error)
    return null
  }
}

