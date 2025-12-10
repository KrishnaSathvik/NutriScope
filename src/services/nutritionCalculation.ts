import { logger } from '@/utils/logger'
import { FoodItem } from '@/types'

/**
 * Calculate nutrition from natural language meal description
 * Uses OpenAI to extract food items and amounts, then calculates nutrition
 */
export async function calculateNutritionFromText(
  description: string,
  imageUrl?: string
): Promise<{
  food_items: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fats: number
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}> {
  const { openai } = await import('@/lib/openai')
  
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const systemPrompt = `You are a nutrition extraction engine.

Goal:
- Turn a natural language meal description into structured JSON.
- NO prose, NO LaTeX, NO markdown – ONLY a single valid JSON object.

Rules:
- If the user provides exact calories / protein / macros for a food item
  (e.g. "5 nuggets (210 cal, 13g protein)"), ALWAYS use those values.
- Do NOT override explicit label values with your own estimates.
- If the user provides only weight/portion (e.g. "100g chicken", "2 cups rice"),
  estimate calories/protein/carbs/fats using standard nutrition values.
- If no amount is given, assume a reasonable single serving.
- Convert all quantities to a string quantity field (e.g. "100 g", "1 cup", "5 pieces").
- Be conservative rather than wildly overestimating.

Output format (JSON ONLY):
{
  "food_items": [
    {
      "name": "string",
      "quantity": "string",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number
    }
  ],
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | null
}

- All numeric values must be plain numbers (no units, no strings).
- Do not include any extra fields.
- Do not include explanations or comments.`

    const userPrompt = `Meal description: ${JSON.stringify(description)}`

    const messages: any[] = []
    messages.push({
      role: 'system',
      content: systemPrompt,
    })

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
        ],
      })
    } else {
      messages.push({
        role: 'user',
        content: userPrompt,
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      logger.error('Failed to parse nutrition JSON, raw:', raw)
      throw new Error('Invalid nutrition response from AI')
    }

    const food_items: FoodItem[] = Array.isArray(parsed.food_items)
      ? parsed.food_items
      : []
    
    // Calculate totals safely
    const totals = food_items.reduce(
      (acc, item) => ({
        calories: acc.calories + (Number(item.calories) || 0),
        protein: acc.protein + (Number(item.protein) || 0),
        carbs: acc.carbs + (Number(item.carbs) || 0),
        fats: acc.fats + (Number(item.fats) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )

    // Fallback meal type detection if AI didn't set it
    let meal_type = parsed.meal_type as
      | 'breakfast'
      | 'lunch'
      | 'dinner'
      | 'snack'
      | undefined

    if (!meal_type) {
      meal_type = extractMealType(description)
    }

    return {
      food_items,
      total_calories: Math.round(totals.calories),
      total_protein: Math.round(totals.protein),
      total_carbs: Math.round(totals.carbs),
      total_fats: Math.round(totals.fats),
      meal_type,
    }
  } catch (error) {
    logger.error('Error calculating nutrition:', error)
    throw new Error('Failed to calculate nutrition from description')
  }
}

/**
 * Extract meal type from text
 */
export function extractMealType(text: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined {
  const lower = text.toLowerCase()
  if (lower.includes('breakfast') || lower.includes('morning')) return 'breakfast'
  if (lower.includes('lunch') || lower.includes('midday')) return 'lunch'
  if (lower.includes('dinner') || lower.includes('evening') || lower.includes('night')) return 'dinner'
  if (lower.includes('snack')) return 'snack'
  return undefined
}

