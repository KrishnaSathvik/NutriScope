import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { getMeals, createMeal, updateMeal, deleteMeal } from '@/services/meals'
import { getMealTemplates, useMealTemplate, createMealTemplate, deleteMealTemplate } from '@/services/mealTemplates'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import PullToRefresh from '@/components/PullToRefresh'
import { Plus, Trash2, X, Clock, UtensilsCrossed, Flame, Target, Cookie, Circle, Sunrise, Moon, Coffee, Sun, BookOpen, Save, Edit, Copy, Lightbulb, Beef } from 'lucide-react'
import { Meal } from '@/types'
import { MealCardSkeleton } from '@/components/LoadingSkeleton'
import { MealForm } from '@/components/MealForm'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { validateNumber } from '@/utils/validation'

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
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const queryClient = useQueryClient()

  // Set up realtime subscription for meals
  useUserRealtimeSubscription('meals', ['meals', 'dailyLog', 'aiInsights'], user?.id)

  const { data: meals, isLoading } = useQuery({
    queryKey: ['meals', today],
    queryFn: () => getMeals(today),
  })

  const { data: yesterdayMeals } = useQuery({
    queryKey: ['meals', yesterday],
    queryFn: () => getMeals(yesterday),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (mealData: { date: string; name?: string; meal_type: string; calories: number; protein: number; carbs?: number; fats?: number; food_items?: any[] }) => createMeal(mealData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      setShowAddForm(false)
      setEditingMealId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Meal> }) => updateMeal(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
      setShowAddForm(false)
      setEditingMealId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
    },
  })

  const { data: templates } = useQuery({
    queryKey: ['mealTemplates', user?.id, selectedMealType],
    queryFn: () => getMealTemplates(user?.id || '', selectedMealType as any),
    enabled: !!user?.id,
  })

  const useTemplateMutation = useMutation({
    mutationFn: (templateId: string) => useMealTemplate(user?.id || '', templateId, today),
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
  
  const totalMeals = meals?.length || 0
  
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

  const editingMeal = editingMealId ? meals?.find(m => m.id === editingMealId) : null

  const handleEdit = (meal: Meal) => {
    setEditingMealId(meal.id)
    setShowAddForm(true)
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingMealId(null)
    setValidationErrors({}) // Clear validation errors
  }

  const copyPreviousDayMutation = useMutation({
    mutationFn: async () => {
      if (!yesterdayMeals || yesterdayMeals.length === 0) {
        throw new Error('No meals found from yesterday')
      }
      
      // Create all meals from yesterday for today
      const promises = yesterdayMeals.map((meal) =>
        createMeal({
          date: today,
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
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      queryClient.invalidateQueries({ queryKey: ['aiInsights'] })
    },
  })

  const handleCopyPreviousDay = () => {
    if (yesterdayMeals && yesterdayMeals.length > 0) {
      if (confirm(`Copy ${yesterdayMeals.length} meal${yesterdayMeals.length > 1 ? 's' : ''} from yesterday?`)) {
        copyPreviousDayMutation.mutate()
      }
    }
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
    const errors: typeof validationErrors = {}
    
    const caloriesValidation = validateNumber(calories, { min: 0, max: 10000, label: 'Calories', required: true })
    if (!caloriesValidation.isValid) errors.calories = caloriesValidation.error
    
    const proteinValidation = validateNumber(protein, { min: 0, max: 1000, label: 'Protein', required: true })
    if (!proteinValidation.isValid) errors.protein = proteinValidation.error
    
    if (carbs !== undefined) {
      const carbsValidation = validateNumber(carbs, { min: 0, max: 1000, label: 'Carbs' })
      if (!carbsValidation.isValid) errors.carbs = carbsValidation.error
    }
    
    if (fats !== undefined) {
      const fatsValidation = validateNumber(fats, { min: 0, max: 1000, label: 'Fats' })
      if (!fatsValidation.isValid) errors.fats = fatsValidation.error
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
      // Create new meal
      createMutation.mutate({
        date: today,
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
                  {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">Meals</h1>
              <div className="flex items-center gap-2 mt-3 md:mt-4">
                <Lightbulb className="w-4 h-4 text-acid flex-shrink-0" />
                <p className="text-[11px] md:text-xs text-dim/70 font-mono">
                  Tip: Use templates or copy yesterday's meals to get started quickly!
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {yesterdayMeals && yesterdayMeals.length > 0 && (
                <button
                  onClick={handleCopyPreviousDay}
                  disabled={copyPreviousDayMutation.isPending}
                  className="btn-secondary gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
                  title="Copy yesterday's meals"
                >
                  <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Copy Yesterday</span>
                  <span className="sm:hidden">Copy</span>
                </button>
              )}
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

      {/* Meal Templates */}
      {showTemplates && (
        <div className="card-modern border-acid/30 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-acid" />
              </div>
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Meal Templates</h2>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-dim hover:text-text transition-colors p-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter by Meal Type */}
          <div className="mb-4">
            <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Filter by Meal Type</label>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              {templates.map((template) => {
                const mealColor = mealTypeColors[template.meal_type] || 'bg-acid/20 text-acid border-acid/30'
                const IconComponent = mealTypeIcons[template.meal_type] || UtensilsCrossed
                return (
                  <div key={template.id} className="border border-border rounded-sm p-4 md:p-4 hover:border-acid/50 transition-all bg-panel/50 relative">
                    {/* Delete button - positioned absolutely */}
                    <button
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      className="absolute top-3 right-3 text-error hover:text-error/80 transition-colors p-1 z-10"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Template name and icon */}
                    <div className="flex items-start gap-2 mb-3 pr-10">
                      <div className={`w-8 h-8 rounded-sm ${mealColor} flex items-center justify-center border flex-shrink-0`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 w-full overflow-visible">
                        <h3 className="font-bold text-text text-sm md:text-sm font-mono md:uppercase break-words whitespace-normal leading-relaxed w-full">{template.name}</h3>
                        <div className="text-[10px] md:text-xs text-dim font-mono capitalize mt-1">
                          {mealTypeLabels[template.meal_type]}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
                      {template.calories && (
                        <div>
                          <span className="text-dim">Calories:</span>
                          <span className="text-text font-bold ml-1">{template.calories}</span>
                        </div>
                      )}
                      {template.protein && (
                        <div>
                          <span className="text-dim">Protein:</span>
                          <span className="text-success font-bold ml-1">{template.protein}g</span>
                        </div>
                      )}
                      {template.carbs !== undefined && (
                        <div>
                          <span className="text-dim">Carbs:</span>
                          <span className="text-text font-bold ml-1">{template.carbs}g</span>
                        </div>
                      )}
                      {template.fats !== undefined && (
                        <div>
                          <span className="text-dim">Fats:</span>
                          <span className="text-text font-bold ml-1">{template.fats}g</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => useTemplateMutation.mutate(template.id)}
                      disabled={useTemplateMutation.isPending}
                      className="btn-primary w-full flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span>{useTemplateMutation.isPending ? 'Adding...' : 'Use Template'}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-dim font-mono text-sm">
              No templates found. Create templates from your meals to quickly log them later.
            </div>
          )}
        </div>
      )}

      {/* Daily Summary */}
      {meals && meals.length > 0 && (
        <div className="card-modern p-3 md:p-4 mb-4 md:mb-6 max-w-xs">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
            <UtensilsCrossed className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase truncate">Meals</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-text font-mono">{totalMeals}</div>
        </div>
      )}

      {(showAddForm || editingMealId) && (
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
      )}

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
                        <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-success fill-success/80 dark:text-success dark:fill-success/80 stroke-success stroke-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Protein</div>
                          <div className="text-xs md:text-sm font-bold text-success font-mono">{meal.protein}g</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Cookie className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-yellow-500 dark:text-yellow-500 dark:fill-yellow-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Carbs</div>
                          <div className="text-xs md:text-sm font-bold text-yellow-500 dark:text-text font-mono">
                            {meal.carbs !== undefined ? `${meal.carbs}g` : '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Circle className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Fats</div>
                          <div className="text-xs md:text-sm font-bold text-amber-500 dark:text-text font-mono">
                            {meal.fats !== undefined ? `${meal.fats}g` : '-'}
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
                      onClick={() => deleteMutation.mutate(meal.id)}
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
          <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">No meals logged today</h3>
          <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
            Start tracking your nutrition by adding your first meal
          </p>
          {yesterdayMeals && yesterdayMeals.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={handleCopyPreviousDay}
                disabled={copyPreviousDayMutation.isPending}
                className="btn-secondary inline-flex items-center justify-center gap-2 text-sm md:text-base py-2.5 md:py-3 px-4 md:px-6 font-mono uppercase tracking-wider"
              >
                <Copy className="w-4 h-4 md:w-5 md:h-5" />
                <span>Copy Yesterday ({yesterdayMeals.length})</span>
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
                      <span className="text-success font-bold ml-2">{pendingTemplateData.protein}g</span>
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
      </div>
    </PullToRefresh>
  )
}

