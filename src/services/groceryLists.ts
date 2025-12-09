import { supabase } from '@/lib/supabase'
import { GroceryList, GroceryItem } from '@/types'
import { getMealPlan } from './mealPlanning'
import { getRecipe } from './recipes'

/**
 * Generate grocery list from meal plan
 */
export async function generateGroceryListFromMealPlan(
  weekStartDate: string,
  listName?: string
): Promise<GroceryList> {
  const mealPlan = await getMealPlan(weekStartDate)
  if (!mealPlan) {
    throw new Error('Meal plan not found')
  }

  const items: GroceryItem[] = []
  const ingredientMap = new Map<string, { quantity: number; unit: string; category?: string }>()

  // Collect ingredients from all planned meals
  for (const [day, meals] of Object.entries(mealPlan.planned_meals)) {
    for (const meal of meals) {
      if (meal.recipe_id) {
        const recipe = await getRecipe(meal.recipe_id)
        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            const key = ingredient.name.toLowerCase()
            const existing = ingredientMap.get(key)
            
            if (existing) {
              // Convert to same unit and add
              const quantity = convertToUnit(ingredient.quantity, ingredient.unit, existing.unit)
              ingredientMap.set(key, {
                quantity: existing.quantity + quantity,
                unit: existing.unit,
                category: categorizeIngredient(ingredient.name),
              })
            } else {
              ingredientMap.set(key, {
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                category: categorizeIngredient(ingredient.name),
              })
            }
          }
        }
      }
    }
  }

  // Convert map to array
  for (const [name, data] of ingredientMap.entries()) {
    items.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: Math.round(data.quantity * 100) / 100,
      unit: data.unit,
      checked: false,
      category: data.category,
    })
  }

  // Sort by category
  items.sort((a, b) => {
    const categoryOrder = ['produce', 'meat', 'dairy', 'pantry', 'other']
    const aIdx = categoryOrder.indexOf(a.category || 'other')
    const bIdx = categoryOrder.indexOf(b.category || 'other')
    return aIdx - bIdx
  })

  return await createGroceryList({
    name: listName || `Grocery List - Week of ${weekStartDate}`,
    items,
    week_start_date: weekStartDate,
  })
}

/**
 * Categorize ingredient
 */
function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase()
  
  if (lower.includes('chicken') || lower.includes('beef') || lower.includes('pork') || 
      lower.includes('fish') || lower.includes('turkey') || lower.includes('meat')) {
    return 'meat'
  }
  if (lower.includes('milk') || lower.includes('cheese') || lower.includes('yogurt') || 
      lower.includes('butter') || lower.includes('cream')) {
    return 'dairy'
  }
  if (lower.includes('vegetable') || lower.includes('broccoli') || lower.includes('spinach') ||
      lower.includes('carrot') || lower.includes('tomato') || lower.includes('onion') ||
      lower.includes('pepper') || lower.includes('lettuce') || lower.includes('cucumber')) {
    return 'produce'
  }
  if (lower.includes('rice') || lower.includes('pasta') || lower.includes('flour') ||
      lower.includes('sugar') || lower.includes('oil') || lower.includes('spice')) {
    return 'pantry'
  }
  return 'other'
}

/**
 * Convert quantity to different unit (simplified)
 */
function convertToUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity

  // Convert to grams/ml first, then to target unit
  let grams = quantity
  if (fromUnit === 'kg') grams = quantity * 1000
  else if (fromUnit === 'l') grams = quantity * 1000
  else if (fromUnit === 'cup') grams = quantity * 240
  else if (fromUnit === 'tbsp') grams = quantity * 15
  else if (fromUnit === 'tsp') grams = quantity * 5
  else if (fromUnit === 'piece') grams = quantity * 100

  // Convert from grams to target unit
  if (toUnit === 'kg') return grams / 1000
  if (toUnit === 'l') return grams / 1000
  if (toUnit === 'cup') return grams / 240
  if (toUnit === 'tbsp') return grams / 15
  if (toUnit === 'tsp') return grams / 5
  if (toUnit === 'piece') return grams / 100
  
  return grams
}

/**
 * Get all grocery lists for the current user
 */
export async function getGroceryLists(): Promise<GroceryList[]> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching grocery lists:', error)
    throw new Error('Failed to fetch grocery lists')
  }

  return data || []
}

/**
 * Get a single grocery list by ID
 */
export async function getGroceryList(listId: string): Promise<GroceryList | null> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching grocery list:', error)
    throw new Error('Failed to fetch grocery list')
  }

  return data
}

/**
 * Create a new grocery list
 */
export async function createGroceryList(
  list: Omit<GroceryList, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<GroceryList> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('grocery_lists')
    .insert({
      user_id: user.id,
      ...list,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating grocery list:', error)
    throw new Error('Failed to create grocery list')
  }

  return data
}

/**
 * Update grocery list
 */
export async function updateGroceryList(
  listId: string,
  updates: Partial<Omit<GroceryList, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<GroceryList> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('grocery_lists')
    .update(updates)
    .eq('id', listId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating grocery list:', error)
    throw new Error('Failed to update grocery list')
  }

  return data
}

/**
 * Delete grocery list
 */
export async function deleteGroceryList(listId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('grocery_lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting grocery list:', error)
    throw new Error('Failed to delete grocery list')
  }
}

/**
 * Toggle item checked status
 */
export async function toggleGroceryItem(
  listId: string,
  itemIndex: number
): Promise<GroceryList> {
  const list = await getGroceryList(listId)
  if (!list) {
    throw new Error('Grocery list not found')
  }

  const items = [...list.items]
  items[itemIndex] = {
    ...items[itemIndex],
    checked: !items[itemIndex].checked,
  }

  return await updateGroceryList(listId, { items })
}

