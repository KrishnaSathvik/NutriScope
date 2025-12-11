import { supabase, isUsingDummyClient } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { MealType } from '@/types'

export interface MealLibraryItem {
  id: string
  name: string
  cuisine: 'indian' | 'mexican' | 'american' | 'mediterranean' | 'italian' | 'asian' | 'other'
  meal_type: MealType
  description?: string
  calories: number
  protein: number
  carbs?: number
  fats?: number
  serving_size: string
  food_items?: any[]
  image_url?: string
  instructions?: string
  created_at: string
}

/**
 * Search meals in library
 */
export async function searchMeals(query: string): Promise<MealLibraryItem[]> {
  if (isUsingDummyClient) {
    return getSampleMeals().filter(meal => 
      meal.name.toLowerCase().includes(query.toLowerCase()) ||
      meal.cuisine.toLowerCase().includes(query.toLowerCase())
    )
  }

  try {
    const { data, error } = await supabase
      .from('meal_library')
      .select('*')
      .or(`name.ilike.%${query}%,cuisine.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name')
      .limit(50)

    if (error) {
      handleSupabaseError(error, 'searchMeals')
      throw error
    }

    return (data as MealLibraryItem[]) || []
  } catch (error) {
    console.error('Error searching meals:', error)
    return []
  }
}

/**
 * Get meal by ID
 */
export async function getMeal(mealId: string): Promise<MealLibraryItem | null> {
  if (isUsingDummyClient) {
    return getSampleMeals().find(meal => meal.id === mealId) || null
  }

  try {
    const { data, error } = await supabase
      .from('meal_library')
      .select('*')
      .eq('id', mealId)
      .single()

    if (error) {
      const { isNotFound } = handleSupabaseError(error, 'getMeal')
      if (isNotFound) return null
      throw error
    }

    return data as MealLibraryItem
  } catch (error) {
    console.error('Error getting meal:', error)
    return null
  }
}

/**
 * Get meals by cuisine
 */
export async function getMealsByCuisine(
  cuisine: MealLibraryItem['cuisine']
): Promise<MealLibraryItem[]> {
  if (isUsingDummyClient) {
    console.log('Using dummy client, returning sample meals for:', cuisine)
    return getSampleMeals().filter(meal => meal.cuisine === cuisine)
  }

  if (!supabase) {
    console.error('Supabase client not available')
    return []
  }

  try {
    console.log('Fetching meals from database for cuisine:', cuisine)
    const { data, error } = await supabase
      .from('meal_library')
      .select('*')
      .eq('cuisine', cuisine)
      .order('meal_type', { ascending: true })
      .order('name', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Error getting meals by cuisine:', error, 'cuisine:', cuisine)
      console.error('Error details:', JSON.stringify(error, null, 2))
      handleSupabaseError(error, 'getMealsByCuisine')
      // Don't throw, return empty array so UI can show error message
      return []
    }

    console.log(`✅ Found ${data?.length || 0} meals for cuisine: ${cuisine}`)
    if (data && data.length > 0) {
      console.log('Sample meal:', data[0])
    }
    return (data as MealLibraryItem[]) || []
  } catch (error) {
    console.error('Exception getting meals by cuisine:', error)
    return []
  }
}

/**
 * Get meals by meal type
 */
export async function getMealsByMealType(
  mealType: MealType
): Promise<MealLibraryItem[]> {
  if (isUsingDummyClient) {
    return getSampleMeals().filter(meal => meal.meal_type === mealType)
  }

  try {
    const { data, error } = await supabase
      .from('meal_library')
      .select('*')
      .eq('meal_type', mealType)
      .order('name')
      .limit(100)

    if (error) {
      handleSupabaseError(error, 'getMealsByMealType')
      throw error
    }

    return (data as MealLibraryItem[]) || []
  } catch (error) {
    console.error('Error getting meals by meal type:', error)
    return []
  }
}

/**
 * Calculate nutrition values based on quantity multiplier
 * Formula: nutrition_value = base_value × quantity
 */
export function calculateMealNutrition(
  meal: MealLibraryItem,
  quantity: number
): {
  calories: number
  protein: number
  carbs: number
  fats: number
} {
  return {
    calories: Math.round(meal.calories * quantity),
    protein: Math.round(meal.protein * quantity),
    carbs: meal.carbs ? Math.round(meal.carbs * quantity) : 0,
    fats: meal.fats ? Math.round(meal.fats * quantity) : 0,
  }
}

/**
 * Verify meal_library table exists and has data (for debugging)
 */
export async function verifyMealLibrary(): Promise<{ exists: boolean; count: number; error?: string }> {
  if (isUsingDummyClient) {
    return { exists: false, count: 0, error: 'Using dummy client' }
  }

  if (!supabase) {
    return { exists: false, count: 0, error: 'Supabase client not available' }
  }

  try {
    // Try to count meals
    const { count, error } = await supabase
      .from('meal_library')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('❌ meal_library table error:', error)
      return { exists: false, count: 0, error: error.message }
    }

    console.log(`✅ meal_library table exists with ${count || 0} meals`)
    return { exists: true, count: count || 0 }
  } catch (error) {
    console.error('Exception verifying meal_library:', error)
    return { exists: false, count: 0, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Get popular/recommended meals
 */
export async function getPopularMeals(): Promise<MealLibraryItem[]> {
  if (isUsingDummyClient) {
    console.log('Using dummy client, returning sample meals')
    return getSampleMeals().slice(0, 20)
  }

  if (!supabase) {
    console.error('Supabase client not available')
    return []
  }

  try {
    console.log('Fetching popular meals from database')
    const { data, error } = await supabase
      .from('meal_library')
      .select('*')
      .order('name')
      .limit(20)

    if (error) {
      console.error('Error getting popular meals:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      handleSupabaseError(error, 'getPopularMeals')
      return []
    }

    console.log(`✅ Found ${data?.length || 0} popular meals`)
    return (data as MealLibraryItem[]) || []
  } catch (error) {
    console.error('Exception getting popular meals:', error)
    return []
  }
}

/**
 * Sample meals for development/dummy client
 */
function getSampleMeals(): MealLibraryItem[] {
  return [
    {
      id: '1',
      name: 'Masala Dosa',
      cuisine: 'indian',
      meal_type: 'breakfast',
      description: 'Crispy rice crepe filled with spiced potatoes',
      calories: 350,
      protein: 8,
      carbs: 55,
      fats: 12,
      serving_size: '1 dosa',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Chicken Tacos',
      cuisine: 'mexican',
      meal_type: 'lunch',
      description: 'Grilled chicken in corn tortillas',
      calories: 380,
      protein: 28,
      carbs: 35,
      fats: 12,
      serving_size: '3 tacos',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Grilled Chicken Sandwich',
      cuisine: 'american',
      meal_type: 'lunch',
      description: 'Grilled chicken breast on bun',
      calories: 450,
      protein: 35,
      carbs: 45,
      fats: 15,
      serving_size: '1 sandwich',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Greek Salad',
      cuisine: 'mediterranean',
      meal_type: 'lunch',
      description: 'Fresh vegetables with feta and olives',
      calories: 380,
      protein: 15,
      carbs: 25,
      fats: 28,
      serving_size: '1 salad',
      created_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Margherita Pizza',
      cuisine: 'italian',
      meal_type: 'lunch',
      description: 'Classic pizza with tomato and mozzarella',
      calories: 450,
      protein: 20,
      carbs: 55,
      fats: 18,
      serving_size: '2 slices',
      created_at: new Date().toISOString(),
    },
  ]
}

