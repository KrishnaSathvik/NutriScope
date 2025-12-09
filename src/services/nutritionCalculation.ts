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
    // Build prompt for nutrition extraction
    const prompt = `Analyze this meal description and extract:
1. All food items with their quantities/amounts (e.g., "100g chicken", "2 cups rice", "1 piece bread")
2. Estimated nutrition for each item (calories, protein in grams, carbs in grams, fats in grams)
3. Meal type if mentioned (breakfast, lunch, dinner, snack)
4. If user provides specific nutrition values (calories, protein, etc.), use those. Otherwise, calculate from food items.

Meal description: "${description}"

IMPORTANT:
- If user says "100g chicken" or "100 grams of chicken", calculate nutrition for exactly 100g of chicken
- If user provides calories/protein directly, use those values
- If no amounts specified, estimate reasonable portions
- Convert all units to grams/ml for calculation
- Use accurate nutrition database values (e.g., chicken breast: ~165 cal/100g, 31g protein/100g)

Respond in JSON format:
{
  "food_items": [
    {
      "name": "chicken breast",
      "quantity": "100g",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fats": 3.6
    }
  ],
  "meal_type": "lunch" // optional: breakfast, lunch, dinner, snack
}

Be accurate with nutrition estimates. Use standard food database values.`

    // Add image if provided
    let messages: any[] = [
      {
        role: 'user',
        content: prompt,
      },
    ]

    if (imageUrl) {
      messages[0].content = [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
      ]
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more accurate nutrition
    })

    const response = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(response)

    const food_items: FoodItem[] = parsed.food_items || []
    
    // Calculate totals
    const totals = food_items.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fats: acc.fats + (item.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )

    return {
      food_items,
      total_calories: Math.round(totals.calories),
      total_protein: Math.round(totals.protein),
      total_carbs: Math.round(totals.carbs),
      total_fats: Math.round(totals.fats),
      meal_type: parsed.meal_type,
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

