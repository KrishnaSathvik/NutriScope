import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { searchFoods, FoodItem, formatServingSize } from '@/services/foodDatabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import clsx from 'clsx'

interface FoodSearchProps {
  open: boolean
  onSelectFood: (food: FoodItem) => void
  onClose: () => void
}

export function FoodSearch({ open, onSelectFood, onClose }: FoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setCurrentPage(1) // Reset to page 1 when search query changes
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Focus input on mount and reset when dialog opens
  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus()
    } else {
      setSearchQuery('')
      setDebouncedQuery('')
      setCurrentPage(1)
      setSelectedFood(null)
    }
  }, [open])

  const pageSize = 20
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['foodSearch', debouncedQuery, currentPage],
    queryFn: () => searchFoods(debouncedQuery, currentPage, pageSize),
    enabled: open && debouncedQuery.length >= 2, // Only search if query is at least 2 characters
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food)
    onSelectFood(food)
    onClose()
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-text font-sans">
            Search Food Database
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for foods (e.g., 'chicken breast', 'apple', 'rice')"
            className="input-modern w-full pl-10 pr-4"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-4 md:p-6">
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
                      <li>Get a free API key from <a href="https://fdc.nal.usda.gov/api-key-sign-up.html" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">USDA FoodData Central</a></li>
                      <li>Add <code className="bg-panel px-1 py-0.5 rounded text-accent">VITE_USDA_API_KEY=your_key_here</code> to your <code className="bg-panel px-1 py-0.5 rounded">.env</code> file</li>
                      <li>Restart your development server</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {!debouncedQuery && (
              <div className="text-center py-8">
                <p className="text-dim font-mono text-sm">Start typing to search for foods...</p>
                <p className="text-xs text-dim font-mono mt-2">Powered by USDA FoodData Central</p>
              </div>
            )}

            {debouncedQuery && debouncedQuery.length < 2 && (
              <div className="text-center py-8">
                <p className="text-dim font-mono text-sm">Type at least 2 characters to search</p>
              </div>
            )}

            {debouncedQuery.length >= 2 && !isLoading && searchResults && searchResults.foods.length === 0 && (
              <div className="text-center py-8">
                <p className="text-dim font-mono text-sm">No foods found for "{debouncedQuery}"</p>
                <p className="text-xs text-dim font-mono mt-2">Try a different search term</p>
              </div>
            )}

            {searchResults && searchResults.foods.length > 0 && (
              <div className="space-y-2">
                {searchResults.foods.map((food) => (
                  <button
                    key={food.fdcId}
                    onClick={() => handleSelectFood(food)}
                    className={clsx(
                      "w-full text-left p-3 md:p-4 border rounded-sm transition-all group",
                      selectedFood?.fdcId === food.fdcId
                        ? "border-accent bg-accent/10"
                        : "border-border bg-panel hover:bg-panel/80 hover:border-accent/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-text font-mono text-sm md:text-base truncate">
                            {food.description}
                          </h3>
                          {selectedFood?.fdcId === food.fdcId && (
                            <Check className="w-4 h-4 text-accent flex-shrink-0" />
                          )}
                        </div>
                        {food.brandName && (
                          <p className="text-xs text-dim font-mono mb-2">{food.brandName}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs text-dim font-mono">
                          <span>Serving: {formatServingSize(food)}</span>
                          <span className="text-accent font-semibold">
                            {food.calories} cal
                          </span>
                          <span>{food.protein}g protein</span>
                          {food.carbs > 0 && <span>{food.carbs}g carbs</span>}
                          {food.fats > 0 && <span>{food.fats}g fats</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {/* Pagination Controls */}
                {searchResults.totalPages > 1 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-dim font-mono">
                        Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, searchResults.totalHits)} of {searchResults.totalHits} results
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1 || isLoading}
                          className={clsx(
                            "px-3 py-1.5 rounded-sm border text-xs font-mono transition-all flex items-center gap-1",
                            currentPage === 1 || isLoading
                              ? "border-border text-dim cursor-not-allowed opacity-50"
                              : "border-border text-text hover:border-accent hover:text-accent hover:bg-accent/10"
                          )}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, searchResults.totalPages) }, (_, i) => {
                            let pageNum: number
                            if (searchResults.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= searchResults.totalPages - 2) {
                              pageNum = searchResults.totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                disabled={isLoading}
                                className={clsx(
                                  "min-w-[32px] px-2 py-1.5 rounded-sm border text-xs font-mono transition-all",
                                  currentPage === pageNum
                                    ? "border-accent bg-accent/10 text-accent font-semibold"
                                    : "border-border text-text hover:border-accent hover:text-accent hover:bg-accent/5",
                                  isLoading && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(searchResults.totalPages, prev + 1))}
                          disabled={currentPage === searchResults.totalPages || isLoading}
                          className={clsx(
                            "px-3 py-1.5 rounded-sm border text-xs font-mono transition-all flex items-center gap-1",
                            currentPage === searchResults.totalPages || isLoading
                              ? "border-border text-dim cursor-not-allowed opacity-50"
                              : "border-border text-text hover:border-accent hover:text-accent hover:bg-accent/10"
                          )}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

