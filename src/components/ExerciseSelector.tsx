import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchExercises, getExercisesByType, ExerciseLibraryItem, calculateCaloriesBurned } from '@/services/exerciseLibrary'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Dumbbell, Activity, Heart, Target, X, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ExerciseSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (exercise: ExerciseLibraryItem, calories: number) => void
  durationMinutes: number
}

export function ExerciseSelector({ 
  open, 
  onClose, 
  onSelect, 
  durationMinutes 
}: ExerciseSelectorProps) {
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const userWeight = profile?.weight || 70 // Default to 70kg if not set

  // Search exercises
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['exerciseSearch', searchQuery],
    queryFn: () => searchExercises(searchQuery),
    enabled: open && searchQuery.length > 0,
  })

  // Get exercises by type
  const { data: typeResults, isLoading: isTypeLoading } = useQuery({
    queryKey: ['exercisesByType', selectedType],
    queryFn: () => {
      if (selectedType === 'all') return Promise.resolve([])
      return getExercisesByType(selectedType as ExerciseLibraryItem['type'])
    },
    enabled: open && searchQuery.length === 0 && selectedType !== 'all',
  })

  const exercises = searchQuery.length > 0 ? searchResults : typeResults
  const isLoading = searchQuery.length > 0 ? isSearching : isTypeLoading

  const exerciseTypes = [
    { value: 'all', label: 'All', icon: Activity },
    { value: 'cardio', label: 'Cardio', icon: Heart },
    { value: 'strength', label: 'Strength', icon: Dumbbell },
    { value: 'yoga', label: 'Yoga', icon: Target },
    { value: 'sports', label: 'Sports', icon: Zap },
    { value: 'other', label: 'Other', icon: Activity },
  ]

  const handleSelect = (exercise: ExerciseLibraryItem) => {
    const calories = calculateCaloriesBurned(
      exercise.met_value,
      userWeight,
      durationMinutes
    )
    onSelect(exercise, calories)
    onClose()
    setSearchQuery('')
  }

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedType('all')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-text font-sans">
            Select Exercise
          </DialogTitle>
          <p className="text-xs md:text-sm text-dim font-mono mt-1">
            Duration: {durationMinutes} min • Weight: {userWeight}kg
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-modern pl-10 w-full text-sm md:text-base"
            autoFocus
          />
        </div>

        {/* Type Filter */}
        <div className="mb-4 -mx-1 px-1">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {exerciseTypes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setSelectedType(value)
                  setSearchQuery('')
                }}
                className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:py-2 rounded-sm border transition-colors whitespace-nowrap flex-shrink-0 snap-start ${
                  selectedType === value
                    ? 'border-acid bg-acid/10 text-acid'
                    : 'border-border bg-panel text-dim hover:text-text hover:border-dim'
                }`}
              >
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="text-[10px] md:text-xs font-mono">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 min-h-0">
          {isLoading ? (
            <div className="text-center py-8 md:py-12 text-dim font-mono text-xs md:text-sm">
              Loading exercises...
            </div>
          ) : exercises && exercises.length > 0 ? (
            exercises.map((exercise) => {
              const calories = calculateCaloriesBurned(
                exercise.met_value,
                userWeight,
                durationMinutes
              )
              
              return (
                <button
                  key={exercise.id}
                  onClick={() => handleSelect(exercise)}
                  className="w-full text-left p-3 md:p-4 border border-border rounded-sm bg-panel hover:border-acid hover:bg-acid/5 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text font-mono text-sm md:text-base mb-1.5 md:mb-2 break-words">
                        {exercise.name}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs text-dim font-mono">
                        <span className="bg-surface px-2 py-0.5 rounded border border-border">
                          {exercise.type}
                        </span>
                        <span className="bg-surface px-2 py-0.5 rounded border border-border">
                          METs: {exercise.met_value}
                        </span>
                        {exercise.muscle_groups.length > 0 && (
                          <span className="bg-surface px-2 py-0.5 rounded border border-border truncate max-w-[150px]">
                            {exercise.muscle_groups.slice(0, 2).join(', ')}
                            {exercise.muscle_groups.length > 2 && '...'}
                          </span>
                        )}
                        {exercise.equipment.length > 0 && (
                          <span className="bg-surface px-2 py-0.5 rounded border border-border">
                            {exercise.equipment[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg md:text-xl font-bold text-acid font-mono">
                        {calories}
                      </div>
                      <div className="text-[10px] md:text-xs text-dim font-mono">cal</div>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="text-center py-8 md:py-12 text-dim font-mono text-xs md:text-sm">
              {searchQuery ? (
                <>
                  No exercises found for "{searchQuery}"
                  <br />
                  <span className="text-[10px] mt-2 block">Try a different search term</span>
                </>
              ) : selectedType === 'all' ? (
                <>
                  Start typing to search exercises
                  <br />
                  <span className="text-[10px] mt-2 block">Or select a category above</span>
                </>
              ) : (
                <>
                  No exercises found in this category
                  <br />
                  <span className="text-[10px] mt-2 block">Try searching instead</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-3 md:pt-4 mt-3 md:mt-4">
          <button
            onClick={onClose}
            className="btn-secondary w-full text-sm md:text-base py-2 md:py-2.5"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

