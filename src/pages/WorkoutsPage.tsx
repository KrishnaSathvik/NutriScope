import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, subDays, addDays } from 'date-fns'
import { getExercises, createExercise, updateExercise, deleteExercise } from '@/services/workouts'
import { checkAndUnlockAchievements } from '@/services/achievements'
import { useAuth } from '@/contexts/AuthContext'
import { ExerciseSelector } from '@/components/ExerciseSelector'
import { ExerciseLibraryItem, calculateCaloriesBurned } from '@/services/exerciseLibrary'
import { Plus, Trash2, X, Activity, Flame, Clock, Dumbbell, Heart, Zap, Target, TrendingUp, Search, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Exercise } from '@/types'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function WorkoutsPage() {
  const { user, isGuest, profile } = useAuth()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [formDuration, setFormDuration] = useState<number | string>(30)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null) // Track selected exercise with MET value
  const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null) // Auto-calculated calories
  const [manualCalories, setManualCalories] = useState<number | null>(null) // User-overridden calories
  const formRef = useRef<HTMLFormElement>(null)
  const today = format(new Date(), 'yyyy-MM-dd')
  const queryClient = useQueryClient()

  // Set up realtime subscription for exercises
  useUserRealtimeSubscription('exercises', ['exercises', 'dailyLog', 'aiInsights'], user?.id)

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', selectedDate],
    queryFn: () => getExercises(selectedDate),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: createExercise,
    onSuccess: async (_, variables) => {
      const workoutDate = variables.date
      // Invalidate all exercises queries (for any date)
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      // Invalidate specific date's dailyLog and aiInsights
      queryClient.invalidateQueries({ queryKey: ['dailyLog', workoutDate] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights', workoutDate] })
      // Also invalidate all dailyLog and aiInsights queries (for other pages that might be viewing different dates)
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      // Invalidate analytics (which aggregates multiple dates)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      // Invalidate weekLogs (which includes this date)
      queryClient.invalidateQueries({ queryKey: ['weekLogs'] })
      // Update streak when workout is logged
      queryClient.invalidateQueries({ queryKey: ['streak'] })
      // Check for new achievements
      if (profile) {
        try {
          const newAchievements = await checkAndUnlockAchievements({ profile })
          if (newAchievements.length > 0) {
            queryClient.invalidateQueries({ queryKey: ['achievements'] })
            queryClient.invalidateQueries({ queryKey: ['achievementsWithProgress'] })
          }
        } catch (error) {
          console.error('Error checking achievements:', error)
        }
      }
      setShowAddForm(false)
      setEditingExerciseId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Exercise> }) => updateExercise(id, updates),
    onSuccess: (_, variables) => {
      // Get the workout's date from the workout being edited
      const workout = exercises?.find(ex => ex.id === variables.id)
      const workoutDate = workout?.date || selectedDate
      // Invalidate all exercises queries (for any date)
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      // Invalidate specific date's dailyLog and aiInsights
      queryClient.invalidateQueries({ queryKey: ['dailyLog', workoutDate] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights', workoutDate] })
      // Also invalidate all dailyLog and aiInsights queries (for other pages that might be viewing different dates)
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      // Invalidate analytics (which aggregates multiple dates)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      // Invalidate weekLogs (which includes this date)
      queryClient.invalidateQueries({ queryKey: ['weekLogs'] })
      // Update streak when workout is updated
      queryClient.invalidateQueries({ queryKey: ['streak'] })
      setShowAddForm(false)
      setEditingExerciseId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      // Get the workout's date from the workout being deleted
      const workoutDate = selectedDate
      // Invalidate all exercises queries (for any date)
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      // Invalidate specific date's dailyLog and aiInsights
      queryClient.invalidateQueries({ queryKey: ['dailyLog', workoutDate] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights', workoutDate] })
      // Also invalidate all dailyLog and aiInsights queries (for other pages that might be viewing different dates)
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      // Invalidate analytics (which aggregates multiple dates)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      // Invalidate weekLogs (which includes this date)
      queryClient.invalidateQueries({ queryKey: ['weekLogs'] })
      // Update streak when workout is deleted
      queryClient.invalidateQueries({ queryKey: ['streak'] })
    },
  })

  const editingExercise = editingExerciseId ? exercises?.find(ex => ex.id === editingExerciseId) : null

  // Sync formDuration when editing exercise changes
  useEffect(() => {
    if (editingExercise && editingExercise.duration) {
      setFormDuration(editingExercise.duration)
    } else if (!editingExerciseId && !showAddForm) {
      // Reset to default when not editing
      setFormDuration(30)
    }
  }, [editingExercise?.id, editingExercise?.duration, editingExerciseId, showAddForm])

  const handleEdit = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id)
    setSelectedDate(exercise.date) // Switch to the workout's date
    setShowAddForm(true)
    // Initialize form duration with exercise duration or default to 30
    setFormDuration(exercise.duration || 30)
    // Clear selected exercise when editing (user can select new one if needed)
    setSelectedExercise(null)
    setCalculatedCalories(null)
    setManualCalories(null)
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingExerciseId(null)
    setFormDuration(30) // Reset to default
    setSelectedExercise(null) // Clear selected exercise
    setCalculatedCalories(null) // Clear calculated calories
    setManualCalories(null) // Clear manual override
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    // Use formDuration state if available, otherwise read from form
    const duration = typeof formDuration === 'number' ? formDuration : (formData.get('duration') ? Number(formData.get('duration')) : undefined)
    
    // Validate duration
    if (!duration || duration <= 0) {
      alert('Please enter a valid duration (greater than 0)')
      return
    }
    
    const exerciseData = {
      exercises: [
        {
          name: formData.get('name') as string,
          type: formData.get('type') as any,
          duration: duration,
          calories_burned: formData.get('calories_burned')
            ? Number(formData.get('calories_burned'))
            : undefined,
        },
      ],
      calories_burned: Number(formData.get('calories_burned')),
      duration: duration,
    }

    if (editingExerciseId) {
      // Update existing exercise
      updateMutation.mutate({
        id: editingExerciseId,
        updates: exerciseData,
      })
    } else {
      // Create new exercise for selected date
      createMutation.mutate({
        date: selectedDate,
        ...exerciseData,
      })
    }
  }

  const handleExerciseSelect = (exercise: ExerciseLibraryItem, calories: number) => {
    if (!formRef.current) return
    
    // Store selected exercise with MET value for auto-calculation
    setSelectedExercise(exercise)
    
    // Populate form fields
    const nameInput = formRef.current.querySelector<HTMLInputElement>('input[name="name"]')
    const typeSelect = formRef.current.querySelector<HTMLSelectElement>('select[name="type"]')
    const durationInput = formRef.current.querySelector<HTMLInputElement>('input[name="duration"]')
    const caloriesInput = formRef.current.querySelector<HTMLInputElement>('input[name="calories_burned"]')
    
    if (nameInput) nameInput.value = exercise.name
    if (typeSelect) typeSelect.value = exercise.type
    if (durationInput) {
      durationInput.value = formDuration.toString()
      setFormDuration(formDuration)
    }
    
    // Set calculated calories (will be recalculated when duration changes)
    setCalculatedCalories(calories)
    setManualCalories(null) // Reset manual override
    
    if (caloriesInput) caloriesInput.value = calories.toString()
    
    // Show form if not already visible
    if (!showAddForm) {
      setShowAddForm(true)
    }
  }

  // Auto-calculate calories when duration or selected exercise changes
  useEffect(() => {
    if (selectedExercise && typeof formDuration === 'number' && formDuration > 0 && profile?.weight) {
      const weightKg = profile.weight
      const calculated = calculateCaloriesBurned(
        selectedExercise.met_value,
        weightKg,
        formDuration
      )
      setCalculatedCalories(calculated)
      
      // Update calories input field if not manually overridden
      if (formRef.current && manualCalories === null) {
        const caloriesInput = formRef.current.querySelector<HTMLInputElement>('input[name="calories_burned"]')
        if (caloriesInput) {
          caloriesInput.value = calculated.toString()
        }
      }
    }
  }, [formDuration, selectedExercise, profile?.weight, manualCalories])

  // Calculate totals
  const totalCalories = exercises?.reduce((sum, ex) => sum + (ex.calories_burned || 0), 0) || 0
  const totalDuration = exercises?.reduce((sum, ex) => sum + (ex.duration || 0), 0) || 0
  const workoutCount = exercises?.length || 0

  // Workout type configurations
  const workoutTypeConfig = {
    cardio: {
      icon: Heart,
      color: 'bg-red-500/20 text-red-600 dark:text-red-500 border-red-500/30',
      bgGradient: 'from-red-500/10 to-orange-500/10',
    },
    strength: {
      icon: Dumbbell,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      bgGradient: 'from-blue-500/10 to-purple-500/10',
    },
    yoga: {
      icon: Activity,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      bgGradient: 'from-purple-500/10 to-pink-500/10',
    },
    sports: {
      icon: Zap,
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      bgGradient: 'from-green-500/10 to-emerald-500/10',
    },
    other: {
      icon: Target,
      color: 'bg-acid/20 text-acid border-acid/30',
      bgGradient: 'from-acid/10 to-acid/5',
    },
  }

  const getWorkoutConfig = (type: string) => {
    return workoutTypeConfig[type as keyof typeof workoutTypeConfig] || workoutTypeConfig.other
  }

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['exercises'] }),
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
    ])
  }

  return (
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      <div className="border-b border-border pb-4 md:pb-6">
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="h-px w-6 md:w-8 bg-acid"></div>
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                  {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy').toUpperCase()}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">Workouts</h1>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3 md:mt-4">
                {/* Date Navigation */}
                <div className="flex items-center gap-1.5 bg-surface border border-border rounded-sm p-1">
                  <button
                    onClick={() => {
                      const prevDate = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd')
                      setSelectedDate(prevDate)
                    }}
                    className="p-1.5 hover:bg-panel rounded-sm transition-colors"
                    title="Previous day"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-dim hover:text-text" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={today}
                    className="bg-transparent border-none text-[10px] md:text-xs font-mono text-text focus:outline-none focus:ring-0 px-1.5 py-1 cursor-pointer w-28 md:w-32"
                    title="Select date"
                  />
                  <button
                    onClick={() => {
                      const nextDate = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd')
                      if (nextDate <= today) {
                        setSelectedDate(nextDate)
                      }
                    }}
                    disabled={selectedDate >= today}
                    className="p-1.5 hover:bg-panel rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next day"
                    aria-label="Next day"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-dim hover:text-text" />
                  </button>
                  {selectedDate !== today && (
                    <button
                      onClick={() => setSelectedDate(today)}
                      className="px-2 py-1 text-[9px] md:text-[10px] font-mono uppercase text-acid hover:text-acid/80 transition-colors"
                      title="Go to today"
                    >
                      Today
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-acid flex-shrink-0" />
                  <p className="text-[11px] md:text-xs text-dim/70 font-mono">
                    {selectedDate === today 
                      ? "Tip: Browse the exercise library for accurate calorie calculations!"
                      : "Viewing past workouts. You can edit or add workouts for this date."
                    }
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingExerciseId(null)
                setShowAddForm(!showAddForm)
              }}
              className="btn-secondary gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
            >
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Log Workout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      {exercises && exercises.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="card-modern border-orange-500/30 dark:border-orange-500/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500 flex-shrink-0" />
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Calories</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-orange-500 dark:text-orange-500 font-mono">{totalCalories}</div>
            <div className="text-[10px] md:text-xs text-dim font-mono mt-1">
              {selectedDate === today ? 'burned today' : 'burned'}
            </div>
          </div>
          <div className="card-modern border-success/30 dark:border-acid/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-success fill-success dark:text-success dark:fill-success flex-shrink-0" />
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Duration</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-success dark:text-success font-mono">{totalDuration}</div>
            <div className="text-[10px] md:text-xs text-dim font-mono mt-1">minutes</div>
          </div>
          <div className="card-modern border-purple-500/30 dark:border-acid/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500 flex-shrink-0" />
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Workouts</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-purple-500 dark:text-text font-mono">{workoutCount}</div>
            <div className="text-[10px] md:text-xs text-dim font-mono mt-1">
              {selectedDate === today ? 'logged today' : 'logged'}
            </div>
          </div>
        </div>
      )}

      {/* Log/Edit Workout Dialog */}
      <Dialog open={showAddForm || !!editingExerciseId} onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide" hideClose={true}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-acid" />
                  <DialogTitle className="text-2xl md:text-3xl font-bold text-text font-mono uppercase">
                    {editingExerciseId ? 'Edit Workout' : 'Log Workout'}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-dim font-mono mt-2">
                  {editingExerciseId 
                    ? 'Update your workout information below.'
                    : 'Enter workout details manually or browse the exercise library for accurate calorie calculations.'
                  }
                </DialogDescription>
              </div>
              <button
                onClick={handleCancel}
                className="text-dim hover:text-text transition-colors p-1 -mt-1 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <form 
              key={editingExerciseId || 'new'} 
              ref={formRef} 
              onSubmit={handleSubmit} 
              className="space-y-4 md:space-y-6"
            >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                  <Activity className="w-3 h-3 flex-shrink-0" />
                  Exercise Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="name"
                    required
                    className="input-modern text-sm md:text-base flex-1"
                    placeholder="e.g., Running"
                    defaultValue={editingExercise?.exercises[0]?.name || ''}
                  />
                  {!editingExerciseId && (
                    <button
                      type="button"
                      onClick={() => setShowExerciseSelector(true)}
                      className="btn-secondary px-3 md:px-4 flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm flex-shrink-0"
                      title="Browse exercise library"
                    >
                      <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Browse</span>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                  <Target className="w-3 h-3 flex-shrink-0" />
                  Type
                </label>
                <select
                  name="type"
                  required
                  className="input-modern text-sm md:text-base"
                  defaultValue={editingExercise?.exercises[0]?.type || ''}
                >
                  <option value="cardio">Cardio</option>
                  <option value="strength">Strength</option>
                  <option value="yoga">Yoga</option>
                  <option value="sports">Sports</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  min="1"
                  required
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 30"
                  value={formDuration}
                  onChange={(e) => {
                    const inputValue = e.target.value
                    // Allow empty string while typing
                    if (inputValue === '') {
                      setFormDuration('')
                    } else {
                      const numValue = Number(inputValue)
                      if (!isNaN(numValue) && numValue > 0) {
                        setFormDuration(numValue)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure we have a valid number when user leaves the field
                    const numValue = Number(e.target.value)
                    if (isNaN(numValue) || numValue <= 0) {
                      setFormDuration(editingExercise?.duration || 30)
                    } else {
                      setFormDuration(numValue)
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                  <Flame className="w-3 h-3 flex-shrink-0" />
                  Calories Burned
                  {calculatedCalories !== null && manualCalories === null && (
                    <span className="text-[9px] text-accent ml-1">(auto-calculated)</span>
                  )}
                </label>
                <input
                  type="number"
                  name="calories_burned"
                  required
                  min="1"
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 300"
                  defaultValue={editingExercise?.calories_burned || ''}
                  value={manualCalories !== null ? manualCalories : (calculatedCalories !== null ? calculatedCalories : (editingExercise?.calories_burned || ''))}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      setManualCalories(null)
                    } else {
                      const numValue = Number(value)
                      if (!isNaN(numValue) && numValue > 0) {
                        setManualCalories(numValue)
                      }
                    }
                  }}
                />
                {calculatedCalories !== null && manualCalories !== null && manualCalories !== calculatedCalories && (
                  <p className="text-[9px] text-dim font-mono mt-1">
                    Calculated: {calculatedCalories} cal (click to use)
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
              <button
                type="submit"
                className="btn-primary flex-1 text-sm md:text-base py-2.5 md:py-3"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingExerciseId
                  ? (updateMutation.isPending ? 'Updating...' : 'Update Workout')
                  : (createMutation.isPending ? 'Logging...' : 'Log Workout')
                }
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary text-sm md:text-base py-2.5 md:py-3"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise Selector Dialog */}
      <ExerciseSelector
        open={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        onSelect={handleExerciseSelect}
        durationMinutes={typeof formDuration === 'number' ? formDuration : Number(formDuration) || 30}
      />

      {isLoading ? (
        <div className="text-center py-12 text-dim font-mono text-xs">Loading workouts...</div>
      ) : exercises && exercises.length > 0 ? (
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Workouts ({workoutCount})</h2>
            <div className="text-[10px] md:text-xs text-dim font-mono">
              Total: <span className="text-purple-500 dark:text-acid font-bold">{totalCalories}</span> cal
            </div>
          </div>
          {exercises.map((exercise) => {
            const workoutType = exercise.exercises[0]?.type || 'other'
            const config = getWorkoutConfig(workoutType)
            const IconComponent = config.icon
            
            return (
              <div 
                key={exercise.id} 
                className="card-modern group hover:border-acid/50 transition-all duration-300 relative overflow-hidden p-4 md:p-6"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <div className="relative flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
                      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-sm ${config.color} flex items-center justify-center border flex-shrink-0`}>
                        {workoutType === 'cardio' ? (
                          <Heart className="w-5 h-5 md:w-7 md:h-7 text-red-500 fill-red-500 dark:text-red-500 dark:fill-red-500" />
                        ) : (
                          <IconComponent className="w-5 h-5 md:w-7 md:h-7" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                          <h3 className="text-base md:text-lg font-bold text-text font-mono uppercase tracking-wider truncate">
                            {exercise.exercises[0]?.name || 'Workout'}
                          </h3>
                          <span className={`px-2 py-0.5 md:py-1 ${config.color} text-[10px] md:text-xs font-bold font-mono uppercase rounded-sm border self-start`}>
                            {workoutType}
                          </span>
                        </div>
                        {exercise.time && (
                          <div className="flex items-center gap-1 text-[10px] md:text-xs text-dim font-mono">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {format(new Date(`${exercise.date}T${exercise.time}`), 'h:mm a')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-sm bg-orange-500/20 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Calories</div>
                          <div className="text-sm md:text-lg font-bold text-orange-500 dark:text-orange-500 font-mono">{exercise.calories_burned}</div>
                        </div>
                      </div>
                      {exercise.duration && (
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-sm bg-success/20 dark:bg-success/20 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-success fill-success dark:text-success dark:fill-success" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Duration</div>
                            <div className="text-sm md:text-lg font-bold text-success dark:text-success font-mono">{exercise.duration} min</div>
                          </div>
                        </div>
                      )}
                      {exercise.duration && exercise.calories_burned && (
                        <div className="flex items-center gap-1.5 md:gap-2 col-span-2 md:col-span-1">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-sm bg-purple-500/20 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Rate</div>
                            <div className="text-sm md:text-lg font-bold text-purple-500 dark:text-purple-500 font-mono">
                              {Math.round(exercise.calories_burned / exercise.duration)} cal/min
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex md:flex-col gap-2 self-start md:self-auto md:ml-4 md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleEdit(exercise)}
                      className="p-2 text-acid hover:opacity-80 hover:bg-acid/10 rounded-sm transition-all active:scale-95"
                      title="Edit workout"
                    >
                      <Edit className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={() => {
                        // Store the workout date before deletion for proper cache invalidation
                        const workoutDate = exercise.date
                        deleteMutation.mutate(exercise.id, {
                          onSuccess: () => {
                            // Invalidate specific date's queries
                            queryClient.invalidateQueries({ queryKey: ['dailyLog', workoutDate] })
                            queryClient.invalidateQueries({ queryKey: ['aiInsights', workoutDate] })
                          }
                        })
                      }}
                      className="p-2 text-error hover:text-error/80 hover:bg-error/10 rounded-sm transition-all active:scale-95"
                      title="Delete workout"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-modern text-center border-dashed py-12 md:py-16 px-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-acid/10 border border-acid/20 flex items-center justify-center mx-auto mb-6 md:mb-8">
            <Activity className="w-8 h-8 md:w-10 md:h-10 text-acid/60" />
          </div>
          <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">
            {selectedDate === today ? 'No workouts logged today' : `No workouts logged on ${format(parseISO(selectedDate), 'MMMM d, yyyy')}`}
          </h3>
          <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
            {selectedDate === today 
              ? 'Start tracking your fitness journey'
              : 'Add workouts for this date to track your fitness history'
            }
          </p>
        </div>
      )}
      </div>
  )
}
