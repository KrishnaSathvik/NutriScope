import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, subDays, parseISO, addDays } from 'date-fns'
import { getMeals, createMeal, updateMeal, deleteMeal } from '@/services/meals'
import { getMealTemplates, useMealTemplate, createMealTemplate, deleteMealTemplate } from '@/services/mealTemplates'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import PullToRefresh from '@/components/PullToRefresh'
import { Plus, Trash2, X, Clock, UtensilsCrossed, Flame, Cookie, Circle, Sunrise, Moon, Coffee, Sun, BookOpen, Save, Edit, Copy, Lightbulb, Beef, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Meal, MealType } from '@/types'
import { MealCardSkeleton } from '@/components/LoadingSkeleton'
import { MealForm } from '@/components/MealForm'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { validateNumber } from '@/utils/validation'
import { formatOptionalNutrition } from '@/utils/format'

export default function MealsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<string>('')
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [templateName, setTemplateName] = useState('')
  const [pendingTemplateData, setPendingTemplateData] = useState<{
    meal_type: string
    calories: number
    protein: number
    carbs?: number
    fats?: number
  } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [copySourceDate, setCopySourceDate] = useState<string>('')
  const [selectedMealIds, setSelectedMealIds] = useState<Set<string>>(new Set())
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const queryClient = useQueryClient()

  // Set up realtime subscription for meals
  useUserRealtimeSubscription('meals', ['meals', 'dailyLog', 'aiInsights'], user?.id)

  const { data: meals, isLoading } = useQuery({
    queryKey: ['meals', selectedDate],
    queryFn: () => getMeals(selectedDate),
    enabled: !!user,
  })

  const { data: yesterdayMeals } = useQuery({
    queryKey: ['meals', yesterday],
    queryFn: () => getMeals(yesterday),
    enabled: !!user,
  })


  const createMutation = useMutation({
    mutationFn: (mealData: { date: string; name?: string; meal_type: MealType; calories: number; protein: number; carbs?: number; fats?: number; food_items?: any[] }) => createMeal(mealData),
    onSuccess: (_, variables) => {
      const mealDate = variables.date
      // Invalidate all meals queries (for any date)
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      // Invalidate specific date's dailyLog and aiInsights
      queryClient.invalidateQueries({ queryKey: ['dailyLog', mealDate] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights', mealDate] })
      // Also invalidate all dailyLog and aiInsights queries (for other pages that might be viewing different dates)
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      // Invalidate analytics (which aggregates multiple dates)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      // Invalidate weekLogs (which includes this date)
      queryClient.invalidateQueries({ queryKey: ['weekLogs'] })
      // Update streak when meal is logged
      queryClient.invalidateQueries({ queryKey: ['streak'] })
      setShowAddForm(false)
      setEditingMealId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Meal> }) => updateMeal(id, updates),
    onSuccess: (_, variables) => {
      // Get the meal's date from the meal being edited
      const meal = meals?.find(m => m.id === variables.id)
      const mealDate = meal?.date || selectedDate
      // Invalidate all meals queries (for any date)
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      // Invalidate specific date's dailyLog and aiInsights
      queryClient.invalidateQueries({ queryKey: ['dailyLog', mealDate] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights', mealDate] })
      // Also invalidate all dailyLog and aiInsights queries (for other pages that might be viewing different dates)
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      // Invalidate analytics (which aggregates multiple dates)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      // Invalidate weekLogs (which includes this date)
      queryClient.invalidateQueries({ queryKey: ['weekLogs'] })
      // Update streak when meal is updated
      queryClient.invalidateQueries({ queryKey: ['streak'] })
      setShowAddForm(false)
      setEditingMealId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMeal,
    onSuccess: (_, mealId) => {
      // Get the meal's date from the meal being deleted
      const meal = meals?.find(m => m.id === mealId)
      const mealDate = meal?.date || selectedDate
      // Invalidate all meals queries (for any date)
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      // Invalidate specific date's dailyLog and aiInsights
      queryClient.invalidateQueries({ queryKey: ['dailyLog', mealDate] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights', mealDate] })
      // Also invalidate all dailyLog and aiInsights queries (for other pages that might be viewing different dates)
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      // Invalidate analytics (which aggregates multiple dates)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      // Invalidate weekLogs (which includes this date)
      queryClient.invalidateQueries({ queryKey: ['weekLogs'] })
      // Update streak when meal is deleted
      queryClient.invalidateQueries({ queryKey: ['streak'] })
    },
  })

  const { data: templates } = useQuery({
    queryKey: ['mealTemplates', user?.id, selectedMealType],
    queryFn: () => getMealTemplates(user?.id || '', selectedMealType as any),
    enabled: !!user?.id,
  })

  const useTemplateMutation = useMutation({
    mutationFn: (templateId: string) => useMealTemplate(user?.id || '', templateId, selectedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      setShowTemplates(false)
    },
  })

  const saveTemplateMutation = useMutation({
    mutationFn: async (mealData: { name: string; meal_type: string; calories: number; protein: number; carbs?: number; fats?: number }) => {
      return createMealTemplate(user?.id || '', {
        name: mealData.name,
        meal_type: mealData.meal_type as any,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fats: mealData.fats,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplates'] })
      setShowSaveTemplateDialog(false)
      setTemplateName('')
      setPendingTemplateData(null)
    },
  })

  const handleSaveTemplateClick = (mealData: { meal_type: string; calories: number; protein: number; carbs?: number; fats?: number }, defaultName?: string) => {
    setPendingTemplateData(mealData)
    setTemplateName(defaultName || '')
    setShowSaveTemplateDialog(true)
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !pendingTemplateData) return
    
    saveTemplateMutation.mutate({
      name: templateName.trim(),
      ...pendingTemplateData,
    })
  }

  const deleteTemplateMutation = useMutation({
    mutationFn: deleteMealTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplates'] })
    },
  })
  
  
  const mealTypeIcons = {
    pre_breakfast: Coffee,
    breakfast: Sunrise,
    morning_snack: Cookie,
    lunch: UtensilsCrossed,
    evening_snack: Sun,
    dinner: Moon,
    post_dinner: Sun,
  }
  
  const mealTypeColors = {
    pre_breakfast: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    breakfast: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    morning_snack: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    lunch: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    evening_snack: 'bg-acid-soft text-acid border-acid/30',
    dinner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    post_dinner: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  }
  
  const mealTypeLabels = {
    pre_breakfast: 'Pre Breakfast',
    breakfast: 'Breakfast',
    morning_snack: 'Morning Snack',
    lunch: 'Lunch',
    evening_snack: 'Evening Snack',
    dinner: 'Dinner',
    post_dinner: 'Post Dinner',
  }

  // Find editing meal - fetch it separately if needed
  const editingMeal = editingMealId ? (meals?.find(m => m.id === editingMealId) || null) : null

  const handleEdit = (meal: Meal) => {
    setEditingMealId(meal.id)
    setSelectedDate(meal.date) // Switch to the meal's date
    setShowAddForm(true)
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingMealId(null)
    setValidationErrors({}) // Clear validation errors
  }

  const copyMealsMutation = useMutation({
    mutationFn: async ({ sourceDate, mealIds }: { sourceDate: string; mealIds: string[] }) => {
      const sourceMeals = await getMeals(sourceDate)
      if (!sourceMeals || sourceMeals.length === 0) {
        throw new Error(`No meals found for ${format(parseISO(sourceDate), 'MMMM d, yyyy')}`)
      }
      
      // Filter meals to only copy selected ones
      const mealsToCopy = sourceMeals.filter(meal => mealIds.includes(meal.id))
      if (mealsToCopy.length === 0) {
        throw new Error('No meals selected to copy')
      }
      
      // Create selected meals from source date for selected date
      const promises = mealsToCopy.map((meal) =>
        createMeal({
          date: selectedDate,
          meal_type: meal.meal_type,
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fats: meal.fats,
          food_items: meal.food_items || [],
        })
      )
      
      await Promise.all(promises)
    },
    onSuccess: () => {
      // Invalidate all meals queries (for any date)
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      // Invalidate specific date's dailyLog and aiInsights
      queryClient.invalidateQueries({ queryKey: ['dailyLog', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights', selectedDate] })
      // Also invalidate all dailyLog and aiInsights queries (for other pages that might be viewing different dates)
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      // Invalidate analytics (which aggregates multiple dates)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      // Invalidate weekLogs (which includes this date)
      queryClient.invalidateQueries({ queryKey: ['weekLogs'] })
      // Update streak when meals are copied
      queryClient.invalidateQueries({ queryKey: ['streak'] })
      setShowCopyDialog(false)
      setCopySourceDate('')
      setSelectedMealIds(new Set())
    },
  })

  // Fetch meals from the selected source date
  const { data: sourceMeals } = useQuery({
    queryKey: ['meals', copySourceDate],
    queryFn: () => getMeals(copySourceDate),
    enabled: !!copySourceDate && !!user && showCopyDialog,
  })

  const handleCopyMeals = () => {
    if (copySourceDate && selectedMealIds.size > 0) {
      copyMealsMutation.mutate({ 
        sourceDate: copySourceDate, 
        mealIds: Array.from(selectedMealIds) 
      })
    }
  }

  const handleCopyPreviousDay = () => {
    // Always open dialog, defaulting to yesterday if available
    if (yesterdayMeals && yesterdayMeals.length > 0) {
      setCopySourceDate(yesterday)
      setSelectedMealIds(new Set(yesterdayMeals.map(m => m.id))) // Select all by default
    }
    setShowCopyDialog(true)
  }

  const handleToggleMealSelection = (mealId: string) => {
    setSelectedMealIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(mealId)) {
        newSet.delete(mealId)
      } else {
        newSet.add(mealId)
      }
      return newSet
    })
  }

  const handleSelectAllMeals = () => {
    if (sourceMeals && sourceMeals.length > 0) {
      setSelectedMealIds(new Set(sourceMeals.map(m => m.id)))
    }
  }

  const handleDeselectAllMeals = () => {
    setSelectedMealIds(new Set())
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const carbsValue = formData.get('carbs')
    const fatsValue = formData.get('fats')
    const mealTypeValue = formData.get('meal_type')
    const caloriesValue = formData.get('calories')
    const proteinValue = formData.get('protein')
    
    // Clear previous errors
    setValidationErrors({})
    
    // Validate required fields
    if (!mealTypeValue || !caloriesValue || !proteinValue) {
      const errors: typeof validationErrors = {}
      if (!mealTypeValue) errors.calories = 'Meal type is required'
      if (!caloriesValue) errors.calories = 'Calories is required'
      if (!proteinValue) errors.protein = 'Protein is required'
      setValidationErrors(errors)
      return
    }

    const calories = Number(caloriesValue)
    const protein = Number(proteinValue)
    const carbs = carbsValue && carbsValue !== '' ? Number(carbsValue) : undefined
    const fats = fatsValue && fatsValue !== '' ? Number(fatsValue) : undefined
    
    // Validate with inline feedback
    const errors: Record<string, string> = {}
    
    const caloriesValidation = validateNumber(calories, { min: 0, max: 10000, label: 'Calories', required: true })
    if (!caloriesValidation.isValid && caloriesValidation.error) {
      errors.calories = caloriesValidation.error
    }
    
    const proteinValidation = validateNumber(protein, { min: 0, max: 1000, label: 'Protein', required: true })
    if (!proteinValidation.isValid && proteinValidation.error) {
      errors.protein = proteinValidation.error
    }
    
    if (carbs !== undefined) {
      const carbsValidation = validateNumber(carbs, { min: 0, max: 1000, label: 'Carbs' })
      if (!carbsValidation.isValid && carbsValidation.error) {
        errors.carbs = carbsValidation.error
      }
    }
    
    if (fats !== undefined) {
      const fatsValidation = validateNumber(fats, { min: 0, max: 1000, label: 'Fats' })
      if (!fatsValidation.isValid && fatsValidation.error) {
        errors.fats = fatsValidation.error
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    
    const nameValue = formData.get('name')
    const name = nameValue && nameValue.toString().trim() !== '' ? nameValue.toString().trim() : undefined
    
    const mealData = {
      meal_type: mealTypeValue as any,
      name: name,
      calories: calories,
      protein: protein,
      carbs: carbs,
      fats: fats,
    }

    if (editingMealId) {
      // Update existing meal
      updateMutation.mutate({
        id: editingMealId,
        updates: mealData,
      })
    } else {
      // Create new meal for selected date
      createMutation.mutate({
        date: selectedDate,
        name: mealData.name,
        meal_type: mealData.meal_type,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fats: mealData.fats,
        food_items: [],
      })
    }
  }

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meals'] }),
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
      queryClient.invalidateQueries({ queryKey: ['mealTemplates'] }),
    ])
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={!user}>
      <div className="space-y-4 md:space-y-8 px-3 md:px-0 pb-20 md:pb-0">
      <div className="border-b border-border pb-4 md:pb-6 px-3 md:px-0 -mx-3 md:mx-0">
        <div className="px-3 md:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="h-px w-6 md:w-8 bg-acid"></div>
                <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                  {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy').toUpperCase()}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">Meals</h1>
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
                  <Lightbulb className="w-4 h-4 text-acid flex-shrink-0" />
                  <p className="text-[11px] md:text-xs text-dim/70 font-mono">
                    {selectedDate === today 
                      ? "Tip: Use templates or copy yesterday's meals to get started quickly!"
                      : "Viewing past meals. You can edit or add meals for this date."
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (yesterdayMeals && yesterdayMeals.length > 0) {
                    handleCopyPreviousDay()
                  } else {
                    setShowCopyDialog(true)
                  }
                }}
                disabled={copyMealsMutation.isPending}
                className="btn-secondary gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
                title="Copy meals from a previous day"
              >
                <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Copy Meals</span>
                <span className="sm:hidden">Copy</span>
              </button>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="btn-secondary gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span>Templates</span>
              </button>
              <button
                onClick={() => {
                  setEditingMealId(null)
                  setShowAddForm(!showAddForm)
                }}
                className="btn-primary gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span>Add Meal</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-acid" />
                  <DialogTitle className="text-2xl md:text-3xl font-bold text-text font-mono uppercase">
                    Meal Templates
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-dim font-mono mt-2">
                  Select a template to quickly add a meal to your log.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Filter by Meal Type */}
            <div className="p-4 bg-panel rounded-sm border border-border">
              <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">Filter by Meal Type</label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="input-modern text-sm md:text-base"
              >
                <option value="">All Types</option>
                {Object.entries(mealTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Templates List */}
            {templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => {
                  const mealColor = mealTypeColors[template.meal_type] || 'bg-acid/20 text-acid border-acid/30'
                  const IconComponent = mealTypeIcons[template.meal_type] || UtensilsCrossed
                  return (
                    <div key={template.id} className="p-4 bg-panel rounded-sm border border-border hover:border-acid/50 transition-all relative">
                      {/* Delete button - positioned absolutely */}
                      <button
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                        className="absolute top-3 right-3 text-error hover:text-error/80 transition-colors p-1 z-10"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {/* Template name and icon */}
                      <div className="flex items-start gap-3 mb-4 pr-10">
                        <div className={`w-10 h-10 rounded-sm ${mealColor} flex items-center justify-center border flex-shrink-0`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-text text-base font-mono uppercase break-words">{template.name}</h3>
                          <div className="text-xs text-dim font-mono capitalize mt-1">
                            {mealTypeLabels[template.meal_type]}
                          </div>
                        </div>
                      </div>
                      
                      {/* Nutrition Info */}
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm font-mono">
                        {template.calories && (
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-dim">Calories:</span>
                            <span className="text-text font-bold">{template.calories}</span>
                          </div>
                        )}
                        {template.protein && (
                          <div className="flex items-center gap-2">
                            <Beef className="w-4 h-4 text-emerald-500 fill-emerald-500 flex-shrink-0" />
                            <span className="text-dim">Protein:</span>
                            <span className="text-emerald-500 font-bold">{template.protein}g</span>
                          </div>
                        )}
                        {template.carbs !== undefined && (
                          <div className="flex items-center gap-2">
                            <Cookie className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="text-dim">Carbs:</span>
                            <span className="text-text font-bold">{template.carbs}g</span>
                          </div>
                        )}
                        {template.fats !== undefined && (
                          <div className="flex items-center gap-2">
                            <Circle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span className="text-dim">Fats:</span>
                            <span className="text-text font-bold">{template.fats}g</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          useTemplateMutation.mutate(template.id)
                        }}
                        disabled={useTemplateMutation.isPending}
                        className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{useTemplateMutation.isPending ? 'Adding...' : 'Use Template'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-dim font-mono text-sm p-4 bg-panel rounded-sm border border-border">
                No templates found. Create templates from your meals to quickly log them later.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Meal Dialog */}
      <Dialog open={showAddForm || !!editingMealId} onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" hideClose={true}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <UtensilsCrossed className="w-5 h-5 text-acid" />
                  <DialogTitle className="text-2xl md:text-3xl font-bold text-text font-mono uppercase">
                    {editingMealId ? 'Edit Meal' : 'Add Meal'}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-dim font-mono mt-2">
                  {editingMealId 
                    ? 'Update your meal information below.'
                    : 'Enter nutrition data manually or search our food database.'
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
            <MealForm
              editingMeal={editingMeal}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onSaveTemplate={!editingMealId ? (mealData) => {
                handleSaveTemplateClick(mealData)
              } : undefined}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              mealTypeLabels={mealTypeLabels}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Meals List */}
      {isLoading ? (
        <div className="space-y-3 md:space-y-4">
          {[1, 2, 3].map((i) => (
            <MealCardSkeleton key={i} />
          ))}
        </div>
      ) : meals && meals.length > 0 ? (
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Meals ({meals.length})</h2>
          </div>
          {meals.map((meal) => {
            const mealType = meal.meal_type || 'meal'
            const mealColor = mealTypeColors[mealType as keyof typeof mealTypeColors] || 'bg-acid/20 text-acid border-acid/30'
            return (
              <div key={meal.id} className="card-modern group hover:border-acid transition-all duration-300 p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-sm ${mealColor} flex items-center justify-center border flex-shrink-0`}>
                        {(() => {
                          const IconComponent = mealTypeIcons[mealType as keyof typeof mealTypeIcons] || UtensilsCrossed
                          return <IconComponent className="w-5 h-5 md:w-6 md:h-6" />
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-bold text-text capitalize font-mono uppercase tracking-wider mb-1 truncate">
                          {meal.name || mealTypeLabels[mealType as keyof typeof mealTypeLabels] || mealType.replace('_', ' ')}
                        </h3>
                        {meal.name && (
                          <div className="text-[10px] md:text-xs text-dim font-mono mb-1">
                            {mealTypeLabels[mealType as keyof typeof mealTypeLabels] || mealType.replace('_', ' ')}
                          </div>
                        )}
                        {meal.time && (
                          <div className="flex items-center gap-1 text-[10px] md:text-xs text-dim font-mono">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {format(new Date(`${meal.date}T${meal.time}`), 'h:mm a')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nutrition Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Calories</div>
                          <div className="text-xs md:text-sm font-bold text-orange-500 dark:text-text font-mono">{meal.calories}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 fill-emerald-500 dark:text-emerald-500 dark:fill-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Protein</div>
                          <div className="text-xs md:text-sm font-bold text-emerald-500 dark:text-text font-mono">{meal.protein}g</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Cookie className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-yellow-500 dark:text-yellow-500 dark:fill-yellow-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Carbs</div>
                          <div className="text-xs md:text-sm font-bold text-yellow-500 dark:text-text font-mono">
                            {formatOptionalNutrition(meal.carbs)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Circle className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Fats</div>
                          <div className="text-xs md:text-sm font-bold text-amber-500 dark:text-text font-mono">
                            {formatOptionalNutrition(meal.fats)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2 md:ml-4 md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleEdit(meal)}
                      className="p-2 text-acid hover:opacity-80 hover:bg-acid/10 rounded-sm transition-all active:scale-95"
                      title="Edit meal"
                    >
                      <Edit className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={() => {
                        handleSaveTemplateClick({
                          meal_type: meal.meal_type || 'lunch',
                          calories: meal.calories,
                          protein: meal.protein,
                          carbs: meal.carbs,
                          fats: meal.fats,
                        }, `${mealTypeLabels[meal.meal_type as keyof typeof mealTypeLabels] || 'Meal'} - ${meal.calories} cal`)
                      }}
                      className="p-2 text-acid hover:opacity-80 hover:bg-acid/10 rounded-sm transition-all active:scale-95"
                      title="Save as template"
                    >
                      <Save className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={() => {
                        // Store the meal date before deletion for proper cache invalidation
                        const mealDate = meal.date
                        deleteMutation.mutate(meal.id, {
                          onSuccess: () => {
                            // Invalidate specific date's queries
                            queryClient.invalidateQueries({ queryKey: ['dailyLog', mealDate] })
                            queryClient.invalidateQueries({ queryKey: ['aiInsights', mealDate] })
                          }
                        })
                      }}
                      className="p-2 text-error hover:text-error/80 hover:bg-error/10 rounded-sm transition-all active:scale-95"
                      title="Delete meal"
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
            <UtensilsCrossed className="w-8 h-8 md:w-10 md:h-10 text-acid/60" />
          </div>
          <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">
            {selectedDate === today ? 'No meals logged today' : `No meals logged on ${format(parseISO(selectedDate), 'MMMM d, yyyy')}`}
          </h3>
          <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
            {selectedDate === today 
              ? 'Start tracking your nutrition by adding your first meal'
              : 'Add meals for this date to track your nutrition history'
            }
          </p>
          {yesterdayMeals && yesterdayMeals.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowCopyDialog(true)}
                disabled={copyMealsMutation.isPending}
                className="btn-secondary inline-flex items-center justify-center gap-2 text-sm md:text-base py-2.5 md:py-3 px-4 md:px-6 font-mono uppercase tracking-wider"
              >
                <Copy className="w-4 h-4 md:w-5 md:h-5" />
                <span>Copy from Previous Day</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30">
                <Save className="w-5 h-5 text-acid" />
              </div>
              <DialogTitle className="text-lg font-bold text-text uppercase tracking-widest font-mono">
                Save Meal Template
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-dim font-mono">
              Create a reusable template from this meal to quickly log it in the future.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Chicken Salad Lunch"
                className="input-modern w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateName.trim()) {
                    e.preventDefault()
                    handleSaveTemplate()
                  }
                }}
              />
              {pendingTemplateData && (
                <div className="mt-3 p-3 bg-panel border border-border rounded-sm">
                  <div className="text-xs text-dim font-mono uppercase mb-2">Preview</div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-dim">Type:</span>
                      <span className="text-text font-bold ml-2 capitalize">
                        {mealTypeLabels[pendingTemplateData.meal_type as keyof typeof mealTypeLabels] || pendingTemplateData.meal_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-dim">Calories:</span>
                      <span className="text-acid font-bold ml-2">{pendingTemplateData.calories}</span>
                    </div>
                    <div>
                      <span className="text-dim">Protein:</span>
                      <span className="text-emerald-500 dark:text-text font-bold ml-2">{pendingTemplateData.protein}g</span>
                    </div>
                    {pendingTemplateData.carbs !== undefined && (
                      <div>
                        <span className="text-dim">Carbs:</span>
                        <span className="text-text font-bold ml-2">{pendingTemplateData.carbs}g</span>
                      </div>
                    )}
                    {pendingTemplateData.fats !== undefined && (
                      <div>
                        <span className="text-dim">Fats:</span>
                        <span className="text-text font-bold ml-2">{pendingTemplateData.fats}g</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <button
              onClick={() => {
                setShowSaveTemplateDialog(false)
                setTemplateName('')
                setPendingTemplateData(null)
              }}
              className="btn-secondary"
              disabled={saveTemplateMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || saveTemplateMutation.isPending}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {saveTemplateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Template</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Meals Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={(open) => {
        setShowCopyDialog(open)
        if (!open) {
          setCopySourceDate('')
          setSelectedMealIds(new Set())
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30">
                <Copy className="w-5 h-5 text-acid" />
              </div>
              <DialogTitle className="text-lg font-bold text-text uppercase tracking-widest font-mono">
                Copy Meals
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-dim font-mono">
              {copySourceDate 
                ? `Select meals to copy from ${format(parseISO(copySourceDate), 'MMMM d, yyyy')} to ${selectedDate === today ? 'today' : format(parseISO(selectedDate), 'MMMM d, yyyy')}.`
                : `Select a previous day to copy meals from to ${selectedDate === today ? 'today' : format(parseISO(selectedDate), 'MMMM d, yyyy')}.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!copySourceDate ? (
              // Date selection view - show only yesterday first
              <>
                {yesterdayMeals && yesterdayMeals.length > 0 ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setCopySourceDate(yesterday)
                        setSelectedMealIds(new Set(yesterdayMeals.map(m => m.id))) // Select all by default
                      }}
                      className="w-full text-left p-3 rounded-sm border border-border hover:border-acid/50 bg-panel transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-dim" />
                          <div>
                            <div className="font-mono text-sm font-bold text-text">
                              {format(parseISO(yesterday), 'EEEE, MMMM d')}
                            </div>
                            <div className="text-xs text-dim font-mono">
                              {yesterdayMeals.length} meal{yesterdayMeals.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-dim" />
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-dim font-mono text-sm">
                    No meals found for yesterday
                  </div>
                )}
              </>
            ) : (
              // Meals selection view
              <>
                {sourceMeals && sourceMeals.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-dim" />
                        <span className="text-sm font-mono text-text font-bold">
                          {format(parseISO(copySourceDate), 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectAllMeals}
                          className="text-xs font-mono text-acid hover:text-acid/80 transition-colors"
                        >
                          Select All
                        </button>
                        <span className="text-dim">|</span>
                        <button
                          onClick={handleDeselectAllMeals}
                          className="text-xs font-mono text-dim hover:text-text transition-colors"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {sourceMeals.map((meal) => {
                        const mealType = meal.meal_type || 'meal'
                        const mealColor = mealTypeColors[mealType as keyof typeof mealTypeColors] || 'bg-acid/20 text-acid border-acid/30'
                        const IconComponent = mealTypeIcons[mealType as keyof typeof mealTypeIcons] || UtensilsCrossed
                        const isSelected = selectedMealIds.has(meal.id)
                        
                        return (
                          <label
                            key={meal.id}
                            className={`flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-acid bg-acid/10'
                                : 'border-border hover:border-acid/50 bg-panel'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMealSelection(meal.id)}
                              className="mt-1 w-4 h-4 text-acid border-border rounded focus:ring-acid focus:ring-2"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider mb-1 ${mealColor}`}>
                                    <IconComponent className="w-3 h-3 flex-shrink-0" />
                                    {mealTypeLabels[mealType as keyof typeof mealTypeLabels] || mealType.replace('_', ' ')}
                                  </div>
                                  <h3 className="text-sm md:text-base font-bold text-text font-mono mb-1">
                                    {meal.name || mealTypeLabels[mealType as keyof typeof mealTypeLabels] || 'Meal'}
                                  </h3>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                                <div className="flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                  <span className="text-dim">Cal:</span>
                                  <span className="text-text font-bold">{meal.calories}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Beef className="w-3 h-3 text-emerald-500 fill-emerald-500 flex-shrink-0" />
                                  <span className="text-dim">Pro:</span>
                                  <span className="text-emerald-500 font-bold">{meal.protein}g</span>
                                </div>
                                {meal.carbs !== undefined && meal.carbs !== null && (
                                  <div className="flex items-center gap-1">
                                    <Cookie className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                    <span className="text-dim">Carbs:</span>
                                    <span className="text-text font-bold">{formatOptionalNutrition(meal.carbs)}</span>
                                  </div>
                                )}
                                {meal.fats !== undefined && meal.fats !== null && (
                                  <div className="flex items-center gap-1">
                                    <Circle className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                    <span className="text-dim">Fats:</span>
                                    <span className="text-text font-bold">{formatOptionalNutrition(meal.fats)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-dim font-mono text-sm">
                    No meals found for this date
                  </div>
                )}
              </>
            )}
          </div>

          {copySourceDate && (
            <DialogFooter className="flex gap-2">
              <button
                onClick={handleCopyMeals}
                disabled={selectedMealIds.size === 0 || copyMealsMutation.isPending}
                className="btn-primary flex items-center justify-center gap-2 w-full"
              >
                {copyMealsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin"></div>
                    <span>Copying...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Selected ({selectedMealIds.size})</span>
                  </>
                )}
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PullToRefresh>
  )
}

