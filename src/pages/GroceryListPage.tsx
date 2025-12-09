import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getGroceryLists, getOrCreateDefaultList, updateGroceryList, toggleGroceryItem, generateGroceryListFromMealPlan, categorizeGroceryItem } from '@/services/groceryLists'
import { searchGroceryItems, incrementSearchCount, addGroceryItem } from '@/services/groceryItemsDatabase'
import { getCurrentWeekMealPlan } from '@/services/mealPlanning'
import { GroceryList, GroceryItem } from '@/types'
import PullToRefresh from '@/components/PullToRefresh'
import { format, startOfWeek } from 'date-fns'
import { X, ShoppingCart, CheckCircle2, Circle, Package, ChefHat, Search, Trash2, Loader2 } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function GroceryListPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search grocery items database
  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['groceryItemsSearch', debouncedQuery],
    queryFn: () => searchGroceryItems(debouncedQuery, 8),
    enabled: debouncedQuery.length >= 2 && showSuggestions,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Set up realtime subscriptions
  useUserRealtimeSubscription('grocery_lists', ['groceryLists'], user?.id)
  useUserRealtimeSubscription('meal_plans', ['mealPlan'], user?.id)

  const { data: groceryLists = [], isLoading } = useQuery({
    queryKey: ['groceryLists'],
    queryFn: async () => {
      // Ensure default list exists
      await getOrCreateDefaultList()
      return getGroceryLists()
    },
    enabled: !!user,
  })
  
  // Get the default shopping list (first/only list)
  const defaultList = groceryLists.length > 0 ? groceryLists[0] : null

  const { data: mealPlan } = useQuery({
    queryKey: ['mealPlan', weekStart],
    queryFn: getCurrentWeekMealPlan,
    enabled: !!user,
  })


  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<GroceryList> }) =>
      updateGroceryList(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })


  const toggleItemMutation = useMutation({
    mutationFn: ({ listId, itemIndex }: { listId: string; itemIndex: number }) =>
      toggleGroceryItem(listId, itemIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: ({ listId, itemIndex }: { listId: string; itemIndex: number }) => {
      const list = groceryLists.find(l => l.id === listId)
      if (!list) throw new Error('List not found')
      
      const updatedItems = list.items.filter((_, idx) => idx !== itemIndex)
      return updateGroceryList(listId, { items: updatedItems })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const generateFromPlanMutation = useMutation({
    mutationFn: (weekStartDate: string) => generateGroceryListFromMealPlan(weekStartDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
  }

  const handleAddItem = async (itemName?: string, category?: string) => {
    const itemToAdd = (itemName || searchQuery).trim()
    if (!itemToAdd || !defaultList) return

    // Check if item already exists (case-insensitive)
    const itemExists = defaultList.items.some(
      item => item.name.toLowerCase() === itemToAdd.toLowerCase()
    )
    
    if (itemExists) {
      // Item already exists, just clear search
      setSearchQuery('')
      setShowSuggestions(false)
      return
    }

    // Use provided category or auto-categorize
    const itemCategory = category || categorizeGroceryItem(itemToAdd)

    // Increment search count in database (for popularity tracking)
    await incrementSearchCount(itemToAdd)

    // If item doesn't exist in database, optionally add it
    if (!category && suggestions.length === 0 && debouncedQuery.length >= 2) {
      // User is adding a custom item, add it to database for future suggestions
      await addGroceryItem(itemToAdd, itemCategory)
    }

    const newItem: GroceryItem = {
      name: itemToAdd,
      quantity: 1, // Default to 1
      unit: 'item',
      checked: false,
      category: itemCategory,
    }

    updateMutation.mutate({
      id: defaultList.id,
      updates: {
        items: [...defaultList.items, newItem],
      },
    })

    setSearchQuery('')
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }

  const handleSelectSuggestion = (suggestion: { name: string; category: string }) => {
    handleAddItem(suggestion.name, suggestion.category)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        e.preventDefault()
        handleAddItem()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex])
        } else {
          handleAddItem()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const handleDeleteItem = (listId: string, itemIndex: number) => {
    deleteItemMutation.mutate({ listId, itemIndex })
  }

  const getItemsByCategory = (items: GroceryItem[]) => {
    const categories: Record<string, GroceryItem[]> = {}
    items.forEach(item => {
      const cat = item.category || 'other'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push(item)
    })
    return categories
  }

  // Filter items based on search query
  const getFilteredItems = (items: GroceryItem[]) => {
    if (!searchQuery.trim()) return items
    const query = searchQuery.toLowerCase()
    return items.filter(item => item.name.toLowerCase().includes(query))
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={!user}>
      <div className="space-y-4 md:space-y-8 px-3 md:px-0 pb-20 md:pb-0">
        {/* Header */}
        <div className="border-b border-border pb-4 md:pb-6 px-3 md:px-0 -mx-3 md:mx-0">
          <div className="px-3 md:px-0">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div className="h-px w-6 md:w-8 bg-acid"></div>
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">
                Grocery List
              </h1>
              {mealPlan && (
                <button
                  onClick={() => generateFromPlanMutation.mutate(weekStart)}
                  disabled={generateFromPlanMutation.isPending}
                  className="btn-secondary text-xs md:text-sm px-3 md:px-4 py-2 gap-2"
                  title="Generate grocery list from meal plan"
                >
                  <ChefHat className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">From Meal Plan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grocery List */}
        {isLoading ? (
          <div className="text-center py-12 text-dim font-mono text-xs">Loading...</div>
        ) : defaultList ? (
          <div className="card-modern p-4 md:p-6">
            {(() => {
              const filteredItems = getFilteredItems(defaultList.items)
              const itemsByCategory = getItemsByCategory(filteredItems)
              const checkedCount = defaultList.items.filter(i => i.checked).length
              const totalItems = defaultList.items.length

              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-text font-mono uppercase">
                          {defaultList.name}
                        </h2>
                        <div className="text-[10px] md:text-xs text-dim font-mono">
                          {checkedCount} / {totalItems} items
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {totalItems > 0 && (
                    <div className="mb-4">
                      <div className="relative w-full bg-border h-2 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-emerald-500 dark:bg-emerald-500 transition-all duration-300"
                          style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Search Box with Autocomplete */}
                  <div className="mb-4 md:mb-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Search & Add Items
                      </label>
                      <div className="relative" ref={suggestionsRef}>
                        <div className="flex items-center gap-3 bg-panel border border-border rounded-sm px-4 py-3 focus-within:border-acid/50 focus-within:ring-1 focus-within:ring-acid/20 transition-all">
                          <Search className="w-5 h-5 text-dim flex-shrink-0" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value)
                              setShowSuggestions(true)
                              setSelectedSuggestionIndex(-1)
                            }}
                            onFocus={() => {
                              if (debouncedQuery.length >= 2) {
                                setShowSuggestions(true)
                              }
                            }}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent border-none outline-none text-sm md:text-base text-text placeholder:text-dim/50 font-mono"
                            placeholder="Type item name and press Enter to add..."
                            title="Search for items or press Enter/Return to add groceries"
                          />
                          {isLoadingSuggestions && (
                            <Loader2 className="w-4 h-4 text-acid animate-spin flex-shrink-0" />
                          )}
                          {searchQuery && !isLoadingSuggestions && (
                            <button
                              onClick={() => {
                                setSearchQuery('')
                                setShowSuggestions(false)
                                setSelectedSuggestionIndex(-1)
                              }}
                              className="text-dim hover:text-text transition-colors flex-shrink-0 p-1"
                              aria-label="Clear search"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-dim/70 font-mono mt-1.5 px-1">
                          💡 Tip: Search for items or press Enter/Return to add
                        </div>
                        
                        {/* Suggestions Dropdown */}
                        {showSuggestions && debouncedQuery.length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-sm shadow-lg z-50 max-h-64 overflow-y-auto">
                          {suggestions.length > 0 ? (
                            <div className="py-1">
                              {suggestions.map((suggestion, index) => (
                                <button
                                  key={suggestion.id}
                                  onClick={() => handleSelectSuggestion(suggestion)}
                                  className={`w-full text-left px-4 py-2 hover:bg-panel transition-colors flex items-center justify-between ${
                                    index === selectedSuggestionIndex ? 'bg-panel' : ''
                                  }`}
                                >
                                  <span className="font-mono text-sm text-text">{suggestion.name}</span>
                                  <span className="text-xs text-dim uppercase">{suggestion.category}</span>
                                </button>
                              ))}
                            </div>
                          ) : !isLoadingSuggestions ? (
                            <div className="px-4 py-3 text-sm text-dim font-mono">
                              No suggestions found. Press Enter to add "{searchQuery}"
                            </div>
                          ) : null}
                        </div>
                      )}
                      </div>
                    </div>
                    {searchQuery && filteredItems.length === 0 && defaultList.items.length > 0 && !showSuggestions && (
                      <div className="mt-2 text-xs text-dim font-mono">
                        No items found. Press Enter to add "{searchQuery}"
                      </div>
                    )}
                  </div>

                  {/* Items by Category */}
                  {Object.keys(itemsByCategory).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(itemsByCategory).map(([category, items]) => (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-3 h-3 text-dim" />
                            <h3 className="text-xs font-mono uppercase text-dim">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {items.map((item, idx) => {
                              const itemIndex = defaultList.items.indexOf(item)
                              
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-3 p-2 rounded-sm border transition-all ${
                                    item.checked
                                      ? 'bg-panel border-success/30 opacity-60'
                                      : 'bg-surface border-border hover:border-acid/50'
                                  }`}
                                >
                                  <button
                                    onClick={() => toggleItemMutation.mutate({ listId: defaultList.id, itemIndex })}
                                    className="flex-shrink-0"
                                    aria-label={item.checked ? 'Uncheck item' : 'Check item'}
                                  >
                                    {item.checked ? (
                                      <CheckCircle2 className="w-5 h-5 text-success" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-dim hover:text-acid transition-colors" />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-mono text-sm ${item.checked ? 'line-through text-dim' : 'text-text'}`}>
                                      {item.name}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteItem(defaultList.id, itemIndex)}
                                    className="text-error hover:text-error/80 transition-colors p-1 flex-shrink-0"
                                    aria-label="Delete item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-8 text-dim font-mono text-xs">
                      No items found matching "{searchQuery}". Press Enter to add it.
                    </div>
                  ) : (
                    <div className="text-center py-8 text-dim font-mono text-xs">
                      No items yet. Type an item name above and press Enter to add.
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        ) : (
          <div className="card-modern text-center border-dashed py-12 md:py-16 px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-acid/10 border border-acid/20 flex items-center justify-center mx-auto mb-6 md:mb-8">
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-acid/60" />
            </div>
            <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">Your Grocery List</h3>
            <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
              Start adding items and they'll be automatically organized by category
            </p>
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}

