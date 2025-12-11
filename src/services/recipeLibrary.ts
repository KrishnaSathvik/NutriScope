/**
 * Recipe Library Service
 * Fetches pre-built recipes from recipe_library table
 */

import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { RecipeLibraryItem, RecipeIngredient, RecipeNutrition } from '@/types'
import { handleSupabaseError } from '@/lib/errors'

// Re-export RecipeLibraryItem for use in components
export type { RecipeLibraryItem } from '@/types'

/**
 * Get recipes by goal type and cuisine
 */
export async function getRecipesByGoalAndCuisine(
  goalType?: 'lose_weight' | 'gain_muscle' | 'gain_weight' | 'improve_fitness' | 'maintain',
  cuisine?: 'indian' | 'italian' | 'american' | 'mexican' | 'mediterranean' | 'asian' | 'other'
): Promise<RecipeLibraryItem[]> {
  if (isUsingDummyClient) {
    return []
  }

  if (!supabase) {
    console.error('Supabase client not available')
    return []
  }

  try {
    let query = supabase
      .from('recipe_library')
      .select('*')
      .order('name', { ascending: true })
      .limit(10)

    if (goalType) {
      query = query.eq('goal_type', goalType)
    }

    if (cuisine) {
      query = query.eq('cuisine', cuisine)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting recipes:', error)
      handleSupabaseError(error, 'getRecipesByGoalAndCuisine')
      return []
    }

    return (data as RecipeLibraryItem[]) || []
  } catch (error) {
    console.error('Exception getting recipes:', error)
    return []
  }
}

/**
 * Get all recipes (no filters)
 */
export async function getAllRecipes(): Promise<RecipeLibraryItem[]> {
  if (isUsingDummyClient) {
    return []
  }

  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('recipe_library')
      .select('*')
      .order('name', { ascending: true })
      .limit(50)

    if (error) {
      handleSupabaseError(error, 'getAllRecipes')
      return []
    }

    return (data as RecipeLibraryItem[]) || []
  } catch (error) {
    console.error('Exception getting all recipes:', error)
    return []
  }
}

/**
 * Convert RecipeLibraryItem to Recipe format (for saving to user's recipes)
 */
export function convertLibraryRecipeToUserRecipe(
  libraryRecipe: RecipeLibraryItem,
  userId: string
): Omit<Recipe, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    name: libraryRecipe.name,
    description: libraryRecipe.description,
    servings: libraryRecipe.servings,
    prep_time: libraryRecipe.prep_time,
    cook_time: libraryRecipe.cook_time,
    instructions: libraryRecipe.instructions,
    nutrition_per_serving: libraryRecipe.nutrition_per_serving,
    ingredients: libraryRecipe.ingredients,
    image_url: libraryRecipe.image_url,
    tags: libraryRecipe.tags,
    is_favorite: false,
  }
}

