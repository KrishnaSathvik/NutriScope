/**
 * Grocery Items Database Service
 * Provides autocomplete/search functionality for grocery items
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'

export interface GroceryItemSuggestion {
  id: string
  name: string
  category: string
  common_names?: string[]
  search_count: number
}

/**
 * Search for grocery items (autocomplete)
 * @param query - Search query (minimum 2 characters)
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of matching grocery items
 */
export async function searchGroceryItems(
  query: string,
  limit: number = 10
): Promise<GroceryItemSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  if (!supabase) {
    logger.warn('Supabase not configured, returning empty results')
    return []
  }

  try {
    const searchTerm = `%${query.trim()}%`

    // Search by name using ILIKE (case-insensitive pattern matching)
    const { data, error } = await supabase
      .from('grocery_items')
      .select('id, name, category, common_names, search_count')
      .ilike('name', searchTerm)
      .order('search_count', { ascending: false }) // Sort by popularity
      .order('name', { ascending: true }) // Then alphabetically
      .limit(limit)

    if (error) {
      logger.error('Error searching grocery items:', error)
      return []
    }

    // Also search in common_names by filtering results
    // Note: Supabase doesn't support direct array search with ILIKE easily,
    // so we'll do a second query for common_names if needed
    const results = (data as GroceryItemSuggestion[]) || []

    // If we have fewer results than limit, also search common_names
    if (results.length < limit) {
      const { data: commonNameResults } = await supabase
        .from('grocery_items')
        .select('id, name, category, common_names, search_count')
        .contains('common_names', [query.trim().toLowerCase()])
        .order('search_count', { ascending: false })
        .order('name', { ascending: true })
        .limit(limit - results.length)

      if (commonNameResults) {
        // Merge results, avoiding duplicates
        const existingIds = new Set(results.map(r => r.id))
        const additional = (commonNameResults as GroceryItemSuggestion[]).filter(
          item => !existingIds.has(item.id)
        )
        results.push(...additional)
      }
    }

    return results
  } catch (error) {
    logger.error('Error in searchGroceryItems:', error)
    return []
  }
}

/**
 * Increment search count for a grocery item (track popularity)
 * @param itemName - Name of the grocery item
 */
export async function incrementSearchCount(itemName: string): Promise<void> {
  if (!supabase || !itemName) return

  try {
    // Call the RPC function to increment search count
    const { error } = await supabase.rpc('increment_grocery_item_search_count', {
      item_name: itemName.trim(),
    })

    if (error) {
      // If RPC function doesn't exist or fails, try direct update
      logger.debug('RPC function failed, trying direct update:', error)
      const { data: currentItem } = await supabase
        .from('grocery_items')
        .select('id, search_count')
        .ilike('name', itemName.trim())
        .limit(1)
        .single()

      if (currentItem) {
        await supabase
          .from('grocery_items')
          .update({ 
            search_count: (currentItem.search_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentItem.id)
      }
    }
  } catch (error) {
    // Silently fail - this is not critical
    logger.debug('Could not increment search count:', error)
  }
}

/**
 * Add a new grocery item to the database (user-contributed)
 * @param name - Name of the grocery item
 * @param category - Category of the item
 * @param commonNames - Alternative names
 */
export async function addGroceryItem(
  name: string,
  category: string = 'other',
  commonNames: string[] = []
): Promise<GroceryItemSuggestion | null> {
  if (!supabase || !name) return null

  try {
    const { data, error } = await supabase
      .from('grocery_items')
      .insert({
        name: name.trim(),
        category,
        common_names: commonNames,
      })
      .select()
      .single()

    if (error) {
      // If item already exists, return null (not an error)
      if (error.code === '23505') {
        return null
      }
      logger.error('Error adding grocery item:', error)
      return null
    }

    return data as GroceryItemSuggestion
  } catch (error) {
    logger.error('Error in addGroceryItem:', error)
    return null
  }
}

