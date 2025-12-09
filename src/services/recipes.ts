import { supabase } from '@/lib/supabase'
import { Recipe, RecipeIngredient, RecipeNutrition } from '@/types'

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
    const name = ingredient.name.toLowerCase()
    const quantity = ingredient.quantity
    const unit = ingredient.unit.toLowerCase()

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

  // Calculate nutrition if not provided
  let nutrition = recipe.nutrition_per_serving
  if (!nutrition || (nutrition.calories === 0 && nutrition.protein === 0)) {
    nutrition = calculateRecipeNutrition(recipe.ingredients, recipe.servings)
  }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      ...recipe,
      nutrition_per_serving: nutrition,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating recipe:', error)
    throw new Error('Failed to create recipe')
  }

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

  // Recalculate nutrition if ingredients or servings changed
  if (updates.ingredients || updates.servings) {
    const existingRecipe = await getRecipe(recipeId)
    if (existingRecipe) {
      const newIngredients = updates.ingredients || existingRecipe.ingredients
      const newServings = updates.servings || existingRecipe.servings
      updates.nutrition_per_serving = calculateRecipeNutrition(newIngredients, newServings)
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
    throw new Error('Failed to update recipe')
  }

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

