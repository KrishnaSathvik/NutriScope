import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchMeals, getMealsByCuisine, getMealsByMealType, getPopularMeals, verifyMealLibrary, MealLibraryItem, calculateMealNutrition } from '@/services/mealLibrary'
import { MealType } from '@/types'
import { Search, UtensilsCrossed, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MealSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (meal: MealLibraryItem, nutrition: { calories: number; protein: number; carbs: number; fats: number }) => void
  mealType?: MealType
  quantity?: number
}

const cuisineLabels: Record<string, string> = {
  indian: 'Indian',
  mexican: 'Mexican',
  american: 'American',
  mediterranean: 'Mediterranean',
  italian: 'Italian',
  asian: 'Asian',
  other: 'Other',
}

export function MealSelector({ 
  open, 
  onClose, 
  onSelect,
  mealType,
  quantity = 1
}: MealSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all')

  // Search meals
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['mealSearch', searchQuery],
    queryFn: () => searchMeals(searchQuery),
    enabled: open && searchQuery.length > 0,
  })

  // Get meals by cuisine
  const { data: cuisineResults, isLoading: isCuisineLoading, error: cuisineError } = useQuery({
    queryKey: ['mealsByCuisine', selectedCuisine],
    queryFn: () => {
      if (selectedCuisine === 'all') return Promise.resolve([])
      console.log('🔍 Query enabled, fetching meals for:', selectedCuisine)
      return getMealsByCuisine(selectedCuisine as MealLibraryItem['cuisine'])
    },
    enabled: open && searchQuery.length === 0 && selectedCuisine !== 'all',
    staleTime: 0, // Always refetch when cuisine changes
    refetchOnMount: true,
  })

  // Debug logging
  useEffect(() => {
    if (open && selectedCuisine !== 'all') {
      console.log('MealSelector: Fetching meals for cuisine:', selectedCuisine)
    }
    if (cuisineResults) {
      console.log('MealSelector: Received', cuisineResults.length, 'meals for', selectedCuisine)
    }
    if (cuisineError) {
      console.error('MealSelector: Error fetching meals:', cuisineError)
    }
  }, [open, selectedCuisine, cuisineResults, cuisineError])

  // Get popular meals when "all" is selected and no meal type filter
  const { data: popularMeals, isLoading: isPopularLoading, error: popularError } = useQuery({
    queryKey: ['popularMeals'],
    queryFn: () => getPopularMeals(),
    enabled: open && searchQuery.length === 0 && selectedCuisine === 'all' && !mealType,
  })

  // Get meals by meal type if specified
  const { data: mealTypeResults, isLoading: isMealTypeLoading } = useQuery({
    queryKey: ['mealsByMealType', mealType],
    queryFn: () => {
      if (!mealType || selectedCuisine !== 'all' || searchQuery.length > 0) return Promise.resolve([])
      return getMealsByMealType(mealType)
    },
    enabled: open && searchQuery.length === 0 && selectedCuisine === 'all' && !!mealType,
  })

  // Determine which results to use
  let allResults: MealLibraryItem[] | undefined
  if (searchQuery.length > 0) {
    allResults = searchResults
  } else if (selectedCuisine !== 'all') {
    allResults = cuisineResults
  } else if (mealType) {
    allResults = mealTypeResults
  } else {
    allResults = popularMeals
  }

  const isLoading = searchQuery.length > 0 
    ? isSearching 
    : selectedCuisine !== 'all'
    ? isCuisineLoading
    : mealType
    ? isMealTypeLoading
    : isPopularLoading

  // Filter results by meal type ONLY if explicitly filtering (not when browsing by cuisine)
  // When browsing by cuisine, show ALL meals from that cuisine regardless of meal type
  // The mealType prop is just a suggestion/preference, not a hard filter when browsing
  const meals = (allResults || [])

  // Debug: Log computed values
  console.log('🔍 Computed values:', {
    selectedCuisine,
    searchQuery: searchQuery.length,
    mealType,
    allResultsLength: allResults?.length || 0,
    allResults: allResults,
    mealsLength: meals.length,
    meals: meals,
    isLoading,
    isCuisineLoading,
  })

  const cuisines = [
    { value: 'all', label: 'All Cuisines' },
    { value: 'indian', label: 'Indian' },
    { value: 'mexican', label: 'Mexican' },
    { value: 'american', label: 'American' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'italian', label: 'Italian' },
    { value: 'asian', label: 'Asian' },
    { value: 'other', label: 'Other' },
  ]

  const handleSelect = (meal: MealLibraryItem) => {
    const nutrition = calculateMealNutrition(meal, quantity)
    onSelect(meal, nutrition)
    onClose()
    setSearchQuery('')
  }

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedCuisine('all')
    } else {
      // Verify meal library when dialog opens
      verifyMealLibrary().then(result => {
        console.log('📊 Meal Library Verification:', result)
        if (!result.exists) {
          console.error('❌ meal_library table does not exist or has errors:', result.error)
        } else if (result.count === 0) {
          console.warn('⚠️ meal_library table exists but is empty. Run migration 006_populate_meal_library.sql')
        } else {
          console.log(`✅ meal_library table has ${result.count} meals`)
        }
      })
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-text font-sans">
            Select Meal
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            type="text"
            placeholder="Search meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-modern w-full pl-10 pr-4"
          />
        </div>

        {/* Cuisine Filter */}
        {searchQuery.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {cuisines.map((cuisine) => (
              <button
                key={cuisine.value}
                onClick={() => setSelectedCuisine(cuisine.value)}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${
                  selectedCuisine === cuisine.value
                    ? 'bg-accent text-white'
                    : 'bg-panel text-dim hover:bg-panel/80 border border-border'
                }`}
              >
                {cuisine.label}
              </button>
            ))}
          </div>
        )}

        {/* Quantity Display */}
        <div className="mb-4 text-xs text-dim font-mono">
          Quantity: <span className="text-text font-semibold">{quantity}x</span> serving{quantity !== 1 ? 's' : ''}
        </div>

        {/* Meals List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {(() => {
            console.log('🎨 Rendering check:', {
              isLoading,
              isCuisineLoading,
              mealsLength: meals.length,
              mealsIsArray: Array.isArray(meals),
              mealsValue: meals,
              allResultsLength: allResults?.length || 0,
              allResultsValue: allResults,
              cuisineResultsLength: cuisineResults?.length || 0,
              cuisineResultsValue: cuisineResults,
            })
            return null
          })()}
          {isLoading ? (
            <div className="text-center py-8 text-dim font-mono text-sm">Loading meals...</div>
          ) : Array.isArray(meals) && meals.length > 0 ? (
            <div className="space-y-2">
              {meals.map((meal) => {
                const nutrition = calculateMealNutrition(meal, quantity)
                return (
                  <button
                    key={meal.id}
                    onClick={() => handleSelect(meal)}
                    className="w-full text-left p-3 md:p-4 border border-border rounded-sm bg-panel hover:bg-panel/80 hover:border-accent/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <UtensilsCrossed className="w-4 h-4 text-accent flex-shrink-0" />
                          <h3 className="font-semibold text-text font-mono text-sm md:text-base truncate">
                            {meal.name}
                          </h3>
                          <span className="text-[10px] text-dim font-mono px-1.5 py-0.5 bg-border rounded">
                            {cuisineLabels[meal.cuisine]}
                          </span>
                        </div>
                        {meal.description && (
                          <p className="text-xs text-dim font-mono mb-2 line-clamp-2">
                            {meal.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs text-dim font-mono">
                          <span>Serving: {meal.serving_size}</span>
                          <span className="text-accent font-semibold">
                            {nutrition.calories} cal
                          </span>
                          <span>{nutrition.protein}g protein</span>
                          {nutrition.carbs > 0 && <span>{nutrition.carbs}g carbs</span>}
                          {nutrition.fats > 0 && <span>{nutrition.fats}g fats</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-dim font-mono text-sm">
              {searchQuery 
                ? 'No meals found for your search' 
                : selectedCuisine === 'all'
                ? 'Select a cuisine above to browse meals, or start typing to search...'
                : cuisineError
                ? 'Error loading meals. Please try again.'
                : isLoading
                ? 'Loading meals...'
                : 'No meals found for this cuisine. Make sure you have run the meal library migrations.'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

