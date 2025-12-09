import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, Check, X } from 'lucide-react'
import { searchFoods, FoodItem, formatServingSize } from '@/services/foodDatabase'
import clsx from 'clsx'

interface FoodSearchProps {
  onSelectFood: (food: FoodItem) => void
  onClose: () => void
}

export function FoodSearch({ onSelectFood, onClose }: FoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Focus input on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['foodSearch', debouncedQuery],
    queryFn: () => searchFoods(debouncedQuery, 1, 20),
    enabled: debouncedQuery.length >= 2, // Only search if query is at least 2 characters
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food)
    onSelectFood(food)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card-modern w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
          <h2 className="text-lg md:text-xl font-bold text-text font-mono uppercase">Search Food Database</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-panel rounded-sm transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 md:p-6 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dim" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for foods (e.g., 'chicken breast', 'apple', 'rice')"
              className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-sm text-text placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-acid/30 font-mono"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-5 h-5 text-acid animate-spin" />
              </div>
            )}
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="mt-2 text-xs text-dim font-mono">Type at least 2 characters to search</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6">
          {error && (
            <div className="text-center py-8 p-4 border border-error/30 bg-error/5 rounded-sm">
              <p className="text-error font-mono font-bold mb-2">Failed to search food database</p>
              <p className="text-sm text-dim font-mono mt-2">
                {error instanceof Error ? error.message : 'Please try again later'}
              </p>
              {error instanceof Error && error.message.includes('API key') && (
                <div className="mt-4 p-3 bg-surface border border-border rounded-sm text-left">
                  <p className="text-xs text-text font-mono mb-2 font-bold">To fix this:</p>
                  <ol className="text-xs text-dim font-mono space-y-1 list-decimal list-inside">
                    <li>Get a free API key from <a href="https://fdc.nal.usda.gov/api-key-sign-up.html" target="_blank" rel="noopener noreferrer" className="text-acid hover:underline">USDA FoodData Central</a></li>
                    <li>Add <code className="bg-panel px-1 py-0.5 rounded text-acid">VITE_USDA_API_KEY=your_key_here</code> to your <code className="bg-panel px-1 py-0.5 rounded">.env</code> file</li>
                    <li>Restart your development server</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {!debouncedQuery && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-dim mx-auto mb-4 opacity-50" />
              <p className="text-dim font-mono">Start typing to search for foods</p>
              <p className="text-xs text-dim font-mono mt-2">Powered by USDA FoodData Central</p>
            </div>
          )}

          {debouncedQuery && debouncedQuery.length < 2 && (
            <div className="text-center py-8">
              <p className="text-dim font-mono">Type at least 2 characters to search</p>
            </div>
          )}

          {debouncedQuery.length >= 2 && !isLoading && searchResults && searchResults.foods.length === 0 && (
            <div className="text-center py-8">
              <p className="text-dim font-mono">No foods found for "{debouncedQuery}"</p>
              <p className="text-xs text-dim font-mono mt-2">Try a different search term</p>
            </div>
          )}

          {searchResults && searchResults.foods.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-dim font-mono mb-4">
                Found {searchResults.totalHits} results
              </p>
              {searchResults.foods.map((food) => (
                <button
                  key={food.fdcId}
                  onClick={() => handleSelectFood(food)}
                  className={clsx(
                    "w-full text-left p-4 rounded-sm border transition-all",
                    selectedFood?.fdcId === food.fdcId
                      ? "border-acid bg-acid/10"
                      : "border-border hover:border-acid/50 hover:bg-panel"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-text font-mono truncate">{food.description}</h3>
                        {selectedFood?.fdcId === food.fdcId && (
                          <Check className="w-4 h-4 text-acid flex-shrink-0" />
                        )}
                      </div>
                      {food.brandName && (
                        <p className="text-xs text-dim font-mono mb-2">{food.brandName}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs font-mono">
                        <span className="text-text">
                          <span className="text-dim">Cal:</span> {food.calories} kcal
                        </span>
                        <span className="text-text">
                          <span className="text-dim">Protein:</span> {food.protein}g
                        </span>
                        <span className="text-text">
                          <span className="text-dim">Carbs:</span> {food.carbs}g
                        </span>
                        <span className="text-text">
                          <span className="text-dim">Fats:</span> {food.fats}g
                        </span>
                      </div>
                      <p className="text-xs text-dim font-mono mt-2">
                        Serving: {formatServingSize(food)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {searchResults.totalPages > 1 && (
                <p className="text-xs text-dim font-mono text-center mt-4">
                  Showing first {searchResults.foods.length} of {searchResults.totalHits} results
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-border">
          <p className="text-xs text-dim font-mono text-center">
            Nutrition data provided by USDA FoodData Central
          </p>
        </div>
      </div>
    </div>
  )
}

