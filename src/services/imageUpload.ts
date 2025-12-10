import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { guestStorage } from '@/utils/storage'
import { compressImage, getCompressionOptions } from '@/utils/imageCompression'
import { retry } from '@/utils/retry'

/**
 * Upload image to Supabase Storage with compression
 */
export async function uploadImage(
  userId: string,
  file: File,
  folder: 'meals' | 'workouts' | 'chat' = 'chat'
): Promise<string | null> {
  const isGuest = guestStorage.get<boolean>('is_guest')
  
  // Compress image before upload
  const compressionOptions = getCompressionOptions(folder === 'chat' ? 'chat' : 'recipe')
  const compressedFile = await compressImage(file, compressionOptions)
  
  if (isGuest) {
    // For guest mode, convert to data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)
    })
  }

  if (isUsingDummyClient) {
    // Convert to data URL for dummy client
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)
    })
  }

  try {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const fileExt = compressedFile.name.split('.').pop()
    const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`
    // Path should be relative to bucket root, not include bucket name
    const filePath = fileName

    // Retry upload on network errors
    const { error: uploadError } = await retry(
      async () => {
        if (!supabase) throw new Error('Supabase client not available')
        const result = await supabase.storage
          .from('chat-images')
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: false,
          })
        if (result.error) throw result.error
        return result
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        onRetry: (attempt) => {
          console.log(`Retrying image upload (attempt ${attempt})...`)
        },
      }
    )

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      // Fallback to data URL
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.readAsDataURL(compressedFile)
      })
    }

    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    // Fallback to data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)
    })
  }
}

/**
 * Analyze image for meal recognition using OpenAI Vision via backend proxy
 */
export async function analyzeMealImage(
  imageUrl: string,
  userId?: string
): Promise<{
  description: string
  estimatedNutrition?: {
    calories?: number
    protein?: number
    carbs?: number
    fats?: number
  }
}> {
  // Use backend proxy if available (same logic as chat)
  const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false'
  const isProduction = import.meta.env.PROD
  
  // Use backend proxy if enabled (works in both dev and prod)
  if (useBackendProxy) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/chat'
      
      const prompt = 'Analyze this meal image and provide: 1) A detailed description of the food items, 2) Estimated nutrition (calories, protein in grams, carbs in grams, fats in grams). Respond in JSON format: {"description": "...", "estimatedNutrition": {"calories": ..., "protein": ..., "carbs": ..., "fats": ...}}'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'x-user-id': userId }),
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          imageUrl,
          userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API returned ${response.status}`)
      }

      const data = await response.json()
      const message = data.message || data.action?.message || '{}'
      
      try {
        const parsed = JSON.parse(message)
        return {
          description: parsed.description || 'Meal image',
          estimatedNutrition: parsed.estimatedNutrition,
        }
      } catch (e) {
        // If not JSON, try to extract JSON from the message
        const jsonMatch = message.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            return {
              description: parsed.description || 'Meal image',
              estimatedNutrition: parsed.estimatedNutrition,
            }
          } catch (e2) {
            // Fall through to return description only
          }
        }
        return {
          description: message,
        }
      }
    } catch (error) {
      console.error('[Image Analysis] Error via backend proxy:', error)
      // In production, don't fall back to direct OpenAI
      if (isProduction) {
        return {
          description: 'Unable to analyze image',
        }
      }
      // In development, fall back to direct OpenAI if available
      const { openai } = await import('@/lib/openai')
      if (!openai) {
        return {
          description: 'Unable to analyze image',
        }
      }
      // Continue to direct OpenAI code below
    }
  }
  
  // Fallback: use direct OpenAI if backend proxy is disabled (dev only)
  const { openai } = await import('@/lib/openai')
  if (!openai) {
    if (isProduction) {
      return {
        description: 'Unable to analyze image',
      }
    }
    return {
      description: 'Unable to analyze image',
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this meal image and provide: 1) A detailed description of the food items, 2) Estimated nutrition (calories, protein in grams, carbs in grams, fats in grams). Respond in JSON format: {"description": "...", "estimatedNutrition": {"calories": ..., "protein": ..., "carbs": ..., "fats": ...}}',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 300,
    })

    const response = completion.choices[0]?.message?.content || '{}'
    
    try {
      const parsed = JSON.parse(response)
      return {
        description: parsed.description || 'Meal image',
        estimatedNutrition: parsed.estimatedNutrition,
      }
    } catch (e) {
      return {
        description: response,
      }
    }
  } catch (error) {
    console.error('Error analyzing image:', error)
    return {
      description: 'Unable to analyze image',
    }
  }
}

