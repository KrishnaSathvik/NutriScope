import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { ChatMessage, ChatConversation, AIAction } from '@/types'
import { handleSupabaseError } from '@/lib/errors'

/**
 * Save conversation to database
 */
export async function saveConversation(
  userId: string,
  messages: ChatMessage[],
  conversationId?: string
): Promise<string> {
  if (isUsingDummyClient) {
    return conversationId || Date.now().toString()
  }

  try {
    if (conversationId) {
      // Update existing conversation
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          messages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('user_id', userId)

      if (error) {
        handleSupabaseError(error, 'saveConversation')
        throw error
      }
      return conversationId
    } else {
      // Create new conversation
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          messages,
        })
        .select()
        .single()

      if (error) {
        handleSupabaseError(error, 'saveConversation')
        throw error
      }
      return data.id
    }
  } catch (error) {
    console.error('Error saving conversation:', error)
    return conversationId || Date.now().toString()
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  userId: string,
  conversationId: string
): Promise<ChatConversation | null> {
  if (isUsingDummyClient) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (error) {
      const { isNotFound } = handleSupabaseError(error, 'getConversation')
      if (isNotFound) return null
      throw error
    }

    return data as ChatConversation
  } catch (error) {
    console.error('Error getting conversation:', error)
    return null
  }
}

/**
 * Get all conversations for a user
 */
export async function getConversations(userId: string): Promise<ChatConversation[]> {
  if (isUsingDummyClient) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      handleSupabaseError(error, 'getConversations')
      throw error
    }

    return (data as ChatConversation[]) || []
  } catch (error) {
    console.error('Error getting conversations:', error)
    return []
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<boolean> {
  if (isUsingDummyClient) {
    return false
  }

  try {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) {
      handleSupabaseError(error, 'deleteConversation')
      throw error
    }

    return true
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return false
  }
}

