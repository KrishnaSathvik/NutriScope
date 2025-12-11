/**
 * Food Database Service
 * Integrates with USDA FoodData Central API for accurate nutrition data
 * 
 * API Documentation: https://fdc.nal.usda.gov/api-guide.html
 * Base URL: https://api.nal.usda.gov/fdc/v1
 */

export interface FoodItem {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber?: number
  sugar?: number
  sodium?: number
}

export interface FoodSearchResult {
  foods: FoodItem[]
  totalHits: number
  currentPage: number
  totalPages: number
}

/**
 * Search for foods using USDA FoodData Central API
 * @param query - Search query (e.g., "chicken breast", "apple")
 * @param pageNumber - Page number for pagination (default: 1)
 * @param pageSize - Number of results per page (default: 50, max: 200)
 * @returns Search results with food items
 */
export async function searchFoods(
  query: string,
  pageNumber: number = 1,
  pageSize: number = 50
): Promise<FoodSearchResult> {
  if (!query || query.trim().length === 0) {
    return { foods: [], totalHits: 0, currentPage: 1, totalPages: 0 }
  }

  try {
    // USDA FoodData Central API endpoint
    // API key is required - get one at: https://fdc.nal.usda.gov/api-key-sign-up.html
    // Add VITE_USDA_API_KEY to your .env file
    const apiKey = import.meta.env.VITE_USDA_API_KEY
    const apiUrl = apiKey 
      ? `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`
      : `https://api.nal.usda.gov/fdc/v1/foods/search`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        pageNumber,
        pageSize: Math.min(pageSize, 200), // Max 200 per API
        dataType: ['Foundation', 'SR Legacy'], // Foundation Foods and Standard Reference Legacy
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
      }),
    })

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 403) {
        if (!apiKey) {
          throw new Error('USDA API key required. Please add VITE_USDA_API_KEY to your .env file. Get a free key at: https://fdc.nal.usda.gov/api-key-sign-up.html')
        }
        throw new Error('Food database access restricted. Please check your API key or use manual entry.')
      }
      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.')
      }
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your VITE_USDA_API_KEY in .env file.')
      }
      throw new Error(`Food search failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform API response to our FoodItem format
    let debugLogged = false
    const foods: FoodItem[] = (data.foods || []).map((food: any, index: number) => {
      // Extract nutrients from foodNutrients array
      const nutrients = food.foodNutrients || []
      
      // Debug: Log first food's nutrients structure
      if (!debugLogged && index === 0 && nutrients.length > 0) {
        console.log('🔍 Sample food structure:', {
          fdcId: food.fdcId,
          description: food.description,
          nutrientCount: nutrients.length,
          firstNutrient: nutrients[0],
          allNutrientIds: nutrients.map((n: any) => ({
            nutrientId: n.nutrientId,
            nutrientNumber: n.nutrient?.number,
            nutrientIdAlt: n.nutrient?.id,
            value: n.value,
            amount: n.amount
          }))
        })
        debugLogged = true
      }
      
      const getNutrient = (nutrientId: number): number => {
        // USDA API structure: nutrients have nutrientId and value directly
        const nutrient = nutrients.find((n: any) => {
          // Check direct nutrientId field
          if (n.nutrientId === nutrientId) return true
          // Check nested nutrient.number (for some API versions)
          if (n.nutrient?.number === nutrientId) return true
          // Check nested nutrient.id (alternative structure)
          if (n.nutrient?.id === nutrientId) return true
          return false
        })
        
        if (!nutrient) {
          return 0
        }
        
        // Extract value - try direct value first, then nested
        let value = nutrient.value
        if (value === undefined || value === null) {
          value = nutrient.amount
        }
        if (value === undefined || value === null) {
          value = nutrient.nutrient?.value
        }
        if (value === undefined || value === null) {
          value = nutrient.nutrient?.amount
        }
        
        // Convert to number and validate
        const numValue = typeof value === 'number' ? value : parseFloat(value)
        return !isNaN(numValue) && isFinite(numValue) ? numValue : 0
      }

      // USDA Nutrient IDs:
      // 1008 = Energy (kcal)
      // 1003 = Protein
      // 1005 = Carbohydrate, by difference
      // 1004 = Total lipid (fat)
      // 1079 = Fiber, total dietary
      // 2000 = Sugars, total including NLEA
      // 1093 = Sodium, Na
      
      const calories = getNutrient(1008)
      const protein = getNutrient(1003)
      const carbs = getNutrient(1005)
      const fats = getNutrient(1004)
      const fiber = getNutrient(1079)
      const sugar = getNutrient(2000)
      const sodium = getNutrient(1093)

      // Debug: Log if calories are 0 (only for first food to avoid spam)
      if (index === 0 && calories === 0 && nutrients.length > 0) {
        console.warn('⚠️ Calories are 0 for first food:', food.description)
        console.log('Available nutrients (first 10):', nutrients.slice(0, 10).map((n: any) => ({
          nutrientId: n.nutrientId,
          nutrientNumber: n.nutrient?.number,
          nutrientName: n.nutrient?.name,
          value: n.value,
          amount: n.amount,
          nutrientValue: n.nutrient?.value
        })))
      }

      // If calories are 0 but we have nutrients, the search endpoint might have returned abridged data
      // We'll return the food item, but note that full details might be needed
      const foodItem: FoodItem = {
        fdcId: food.fdcId,
        description: food.description || food.lowercaseDescription || 'Unknown food',
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        ingredients: food.ingredients,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10, // Round to 1 decimal
        carbs: Math.round(carbs * 10) / 10,
        fats: Math.round(fats * 10) / 10,
        fiber: fiber > 0 ? Math.round(fiber * 10) / 10 : undefined,
        sugar: sugar > 0 ? Math.round(sugar * 10) / 10 : undefined,
        sodium: sodium > 0 ? Math.round(sodium) : undefined,
      }

      return foodItem
    })

    // According to USDA API guide, search endpoint may return abridged data
    // Fetch full details for foods with 0 calories (limit to first 10 to avoid rate limits)
    const foodsWithDetails = await Promise.all(
      foods.slice(0, 10).map(async (food) => {
        // Only fetch details if calories are 0 and we have an fdcId
        if (food.calories === 0 && food.fdcId) {
          try {
            const fullDetails = await getFoodDetails(food.fdcId)
            if (fullDetails && fullDetails.calories > 0) {
              console.log(`✅ Fetched full details for "${food.description}": ${fullDetails.calories} cal`)
              return fullDetails
            }
          } catch (error) {
            // Silently fail - we'll use the search result data
            console.warn(`⚠️ Failed to fetch details for ${food.fdcId}`)
          }
        }
        return food
      })
    )

    // Combine foods with details and remaining foods
    const allFoods = [...foodsWithDetails, ...foods.slice(10)]

    return {
      foods: allFoods,
      totalHits: data.totalHits || 0,
      currentPage: data.currentPage || pageNumber,
      totalPages: Math.ceil((data.totalHits || 0) / pageSize),
    }
  } catch (error) {
    console.error('Food search error:', error)
    throw new Error('Failed to search food database. Please try again.')
  }
}

/**
 * Get detailed food information by FDC ID
 * @param fdcId - FoodData Central ID
 * @returns Detailed food item
 */
export async function getFoodDetails(fdcId: number): Promise<FoodItem | null> {
  try {
    const apiKey = import.meta.env.VITE_USDA_API_KEY
    const apiUrl = apiKey
      ? `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`
      : `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`
    
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`Food details fetch failed: ${response.statusText}`)
    }

    const food = await response.json()

    const nutrients = food.foodNutrients || []
    
    const getNutrient = (nutrientId: number): number => {
      // Try different possible field names for nutrient ID
      const nutrient = nutrients.find((n: any) => {
        if (n.nutrientId === nutrientId) return true
        if (n.nutrient?.number === nutrientId) return true
        if (n.nutrient?.id === nutrientId) return true
        return false
      })
      
      if (!nutrient) {
        return 0
      }
      
      // Extract value - try direct value first, then nested
      let value = nutrient.value
      if (value === undefined || value === null) {
        value = nutrient.amount
      }
      if (value === undefined || value === null) {
        value = nutrient.nutrient?.value
      }
      if (value === undefined || value === null) {
        value = nutrient.nutrient?.amount
      }
      
      // Convert to number and validate
      const numValue = typeof value === 'number' ? value : parseFloat(value)
      return !isNaN(numValue) && isFinite(numValue) ? numValue : 0
    }

    const calories = getNutrient(1008)
    const protein = getNutrient(1003)
    const carbs = getNutrient(1005)
    const fats = getNutrient(1004)
    const fiber = getNutrient(1079)
    const sugar = getNutrient(2000)
    const sodium = getNutrient(1093)

    return {
      fdcId: food.fdcId,
      description: food.description || food.lowercaseDescription || 'Unknown food',
      brandOwner: food.brandOwner,
      brandName: food.brandName,
      ingredients: food.ingredients,
      servingSize: food.servingSize,
      servingSizeUnit: food.servingSizeUnit,
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fats: Math.round(fats * 10) / 10,
      fiber: fiber > 0 ? Math.round(fiber * 10) / 10 : undefined,
      sugar: sugar > 0 ? Math.round(sugar * 10) / 10 : undefined,
      sodium: sodium > 0 ? Math.round(sodium) : undefined,
    }
  } catch (error) {
    console.error('Food details error:', error)
    return null
  }
}

/**
 * Format serving size for display
 */
export function formatServingSize(food: FoodItem): string {
  if (food.servingSize && food.servingSizeUnit) {
    return `${food.servingSize} ${food.servingSizeUnit}`
  }
  return '100g' // Default serving size
}

