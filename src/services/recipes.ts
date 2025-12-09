import { supabase } from '@/lib/supabase'
import { Recipe, RecipeIngredient, RecipeNutrition } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Calculate nutrition per serving from ingredients
 */
export function calculateRecipeNutrition(
  ingredients: RecipeIngredient[],
  servings: number,
  nutritionDatabase?: Map<string, RecipeNutrition>
): RecipeNutrition {
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFats = 0

  // Simple calculation - in production, use a nutrition database
  // For now, estimate based on common ingredients
  ingredients.forEach((ingredient) => {
    // Skip invalid ingredients - ensure name and unit exist
    if (!ingredient || !ingredient.name || !ingredient.unit) {
      return
    }
    
    const name = String(ingredient.name).toLowerCase()
    const quantity = ingredient.quantity || 0
    const unit = String(ingredient.unit).toLowerCase()

    // Convert to grams for calculation
    let grams = quantity
    if (unit === 'kg') grams = quantity * 1000
    else if (unit === 'ml' || unit === 'l') grams = quantity * (unit === 'l' ? 1000 : 1) // Approximate 1ml = 1g for most liquids
    else if (unit === 'cup') grams = quantity * 240 // Approximate
    else if (unit === 'tbsp') grams = quantity * 15
    else if (unit === 'tsp') grams = quantity * 5
    else if (unit === 'piece' || unit === 'pcs') grams = quantity * 100 // Average

    // Basic nutrition estimates (very simplified - use proper database in production)
    if (name.includes('chicken') || name.includes('turkey')) {
      totalCalories += grams * 1.65 // ~165 cal per 100g
      totalProtein += grams * 0.31 // ~31g protein per 100g
      totalFats += grams * 0.036 // ~3.6g fat per 100g
    } else if (name.includes('beef') || name.includes('pork')) {
      totalCalories += grams * 2.5
      totalProtein += grams * 0.26
      totalFats += grams * 0.17
    } else if (name.includes('fish') || name.includes('salmon')) {
      totalCalories += grams * 2.06
      totalProtein += grams * 0.22
      totalFats += grams * 0.12
    } else if (name.includes('rice') || name.includes('pasta')) {
      totalCalories += grams * 3.65
      totalProtein += grams * 0.07
      totalCarbs += grams * 0.8
    } else if (name.includes('egg')) {
      totalCalories += grams * 1.55
      totalProtein += grams * 0.13
      totalFats += grams * 0.11
    } else if (name.includes('vegetable') || name.includes('broccoli') || name.includes('spinach')) {
      totalCalories += grams * 0.25
      totalProtein += grams * 0.03
      totalCarbs += grams * 0.05
    } else {
      // Default estimates
      totalCalories += grams * 1.0
      totalProtein += grams * 0.05
      totalCarbs += grams * 0.1
    }
  })

  return {
    calories: Math.round(totalCalories / servings),
    protein: Math.round(totalProtein / servings),
    carbs: Math.round(totalCarbs / servings),
    fats: Math.round(totalFats / servings),
  }
}

/**
 * Get all recipes for the current user
 */
export async function getRecipes(): Promise<Recipe[]> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching recipes:', error)
    throw new Error('Failed to fetch recipes')
  }

  return data || []
}

/**
 * Get a single recipe by ID
 */
export async function getRecipe(recipeId: string): Promise<Recipe | null> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('Error fetching recipe:', error)
    throw new Error('Failed to fetch recipe')
  }

  return data
}

/**
 * Create a new recipe
 */
export async function createRecipe(recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Recipe> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Log incoming recipe data for debugging
  logger.debug('Creating recipe:', {
    name: recipe.name,
    servings: recipe.servings,
    instructionsLength: typeof recipe.instructions === 'string' ? recipe.instructions.length : 0,
  })

  // Validate required fields
  if (!recipe.name || !recipe.name.trim()) {
    logger.error('Recipe name is required')
    throw new Error('Recipe name is required')
  }
  
  if (!recipe.servings || recipe.servings <= 0) {
    logger.error('Recipe must have a valid number of servings')
    throw new Error('Recipe must have a valid number of servings')
  }
  
  if (!recipe.instructions || !recipe.instructions.trim()) {
    logger.error('Recipe instructions are required')
    throw new Error('Recipe instructions are required')
  }
  
  // Ensure nutrition is provided
  let nutrition = recipe.nutrition_per_serving
  if (!nutrition) {
    nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    }
  }
  
  // Parse prep_time and cook_time to ensure they're integers
  // Handle cases where AI sends strings like "30 minutes" or "0 minutes"
  const parseTime = (time: number | string | undefined): number | undefined => {
    if (time === undefined || time === null) return undefined
    if (typeof time === 'number') return time > 0 ? time : undefined
    if (typeof time === 'string') {
      // Extract number from strings like "30 minutes", "0 minutes", "45 mins", etc.
      const match = time.match(/(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        return num > 0 ? num : undefined
      }
    }
    return undefined
  }

  // Normalize instructions - ensure it's a string
  const instructions = typeof recipe.instructions === 'string' 
    ? recipe.instructions 
    : Array.isArray(recipe.instructions) 
      ? recipe.instructions.join('\n')
      : ''

  // Only include fields that exist in the database schema
  const recipeToSave = {
    name: recipe.name,
    description: recipe.description,
    servings: recipe.servings,
    prep_time: parseTime(recipe.prep_time),
    cook_time: parseTime(recipe.cook_time),
    instructions,
    image_url: recipe.image_url,
    tags: recipe.tags || [],
    is_favorite: recipe.is_favorite || false,
    nutrition_per_serving: nutrition,
  }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      ...recipeToSave,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating recipe:', error)
    logger.error('Error creating recipe:', error)
    throw new Error(`Failed to create recipe: ${error.message}`)
  }

  if (!data) {
    logger.error('Recipe creation returned no data')
    throw new Error('Failed to create recipe: No data returned')
  }

  logger.debug('Recipe created successfully:', data.id)
  return data
}

/**
 * Update a recipe
 */
export async function updateRecipe(
  recipeId: string,
  updates: Partial<Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Recipe> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Recalculate nutrition if ingredients or servings changed (only if ingredients exist)
  if ((updates.ingredients || updates.servings) && updates.ingredients && updates.ingredients.length > 0) {
    const existingRecipe = await getRecipe(recipeId)
    if (existingRecipe) {
      const newIngredients = updates.ingredients || existingRecipe.ingredients || []
      const newServings = updates.servings || existingRecipe.servings
      if (newIngredients.length > 0) {
        updates.nutrition_per_serving = calculateRecipeNutrition(newIngredients, newServings)
      }
    }
  }

  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', recipeId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating recipe:', error)
    logger.error('Error updating recipe:', error)
    throw new Error(`Failed to update recipe: ${error.message}`)
  }

  if (!data) {
    logger.error('Recipe update returned no data')
    throw new Error('Failed to update recipe: No data returned')
  }

  logger.debug('Recipe updated successfully:', data.id)
  return data
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(recipeId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting recipe:', error)
    throw new Error('Failed to delete recipe')
  }
}

/**
 * Scale recipe ingredients and nutrition for different serving size
 */
export function scaleRecipe(recipe: Recipe, newServings: number): Recipe {
  const scaleFactor = newServings / recipe.servings

  return {
    ...recipe,
    servings: newServings,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: Math.round(ing.quantity * scaleFactor * 100) / 100, // Round to 2 decimals
    })),
    nutrition_per_serving: {
      calories: Math.round(recipe.nutrition_per_serving.calories * scaleFactor),
      protein: Math.round(recipe.nutrition_per_serving.protein * scaleFactor),
      carbs: Math.round(recipe.nutrition_per_serving.carbs * scaleFactor),
      fats: Math.round(recipe.nutrition_per_serving.fats * scaleFactor),
    },
  }
}

