import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentWeekMealPlan, addMealToPlan, removeMealFromPlan, getWeekDays, updateMealPlan } from '@/services/mealPlanning'
import { getRecipes } from '@/services/recipes'
import { createMeal } from '@/services/meals'
import { PlannedMeal, MealType } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import PullToRefresh from '@/components/PullToRefresh'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import { Plus, X, Calendar, ChefHat, UtensilsCrossed, ArrowLeft, ArrowRight } from 'lucide-react'
import { Recipe } from '@/types'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

const MEAL_TYPES: MealType[] = ['pre_breakfast', 'breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'post_dinner']

export default function MealPlanningPage() {
  const { user } = useAuth()
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch')
  const [showAddMealDialog, setShowAddMealDialog] = useState(false)
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const queryClient = useQueryClient()

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekDays = getWeekDays(weekStart)

  // Set up realtime subscriptions
  useUserRealtimeSubscription('meal_plans', ['mealPlan', 'groceryLists'], user?.id)
  useUserRealtimeSubscription('recipes', ['recipes'], user?.id)

  const { data: mealPlan } = useQuery({
    queryKey: ['mealPlan', weekStart],
    queryFn: getCurrentWeekMealPlan,
    enabled: !!user,
  })

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
    enabled: !!user && showRecipeSelector,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateMealPlan(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlan'] })
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const addMealMutation = useMutation({
    mutationFn: ({ planId, day, meal }: { planId: string; day: string; meal: PlannedMeal }) =>
      addMealToPlan(planId, day, meal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlan'] })
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
      setShowAddMealDialog(false)
      setShowRecipeSelector(false)
    },
  })

  const removeMealMutation = useMutation({
    mutationFn: ({ planId, day, index }: { planId: string; day: string; index: number }) =>
      removeMealFromPlan(planId, day, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlan'] })
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const handleAddMeal = (day: string, mealType: MealType) => {
    setSelectedDay(day)
    setSelectedMealType(mealType)
    setShowAddMealDialog(true)
  }

  const handleSelectRecipe = (recipe: Recipe) => {
    if (!mealPlan) return

    const plannedMeal: PlannedMeal = {
      meal_type: selectedMealType,
      recipe_id: recipe.id,
      meal_data: {
        name: recipe.name,
        calories: recipe.nutrition_per_serving.calories,
        protein: recipe.nutrition_per_serving.protein,
        carbs: recipe.nutrition_per_serving.carbs,
        fats: recipe.nutrition_per_serving.fats,
      },
    }

    addMealMutation.mutate({
      planId: mealPlan.id,
      day: selectedDay,
      meal: plannedMeal,
    })
  }

  const handleAddCustomMeal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!mealPlan) return

    const formData = new FormData(e.currentTarget)
    const plannedMeal: PlannedMeal = {
      meal_type: selectedMealType,
      meal_data: {
        name: formData.get('name') as string,
        calories: Number(formData.get('calories')) || 0,
        protein: Number(formData.get('protein')) || 0,
        carbs: formData.get('carbs') ? Number(formData.get('carbs')) : undefined,
        fats: formData.get('fats') ? Number(formData.get('fats')) : undefined,
      },
    }

    addMealMutation.mutate({
      planId: mealPlan.id,
      day: selectedDay,
      meal: plannedMeal,
    })
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['mealPlan'] })
  }

  const getMealTypeLabel = (type: MealType): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
                Meal Planning
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prevWeek = format(addDays(parseISO(weekStart), -7), 'yyyy-MM-dd')
                    queryClient.setQueryData(['mealPlan', weekStart], null)
                    queryClient.invalidateQueries({ queryKey: ['mealPlan', prevWeek] })
                  }}
                  className="btn-secondary p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-dim px-2 whitespace-nowrap">
                  {format(parseISO(weekStart), 'MMM d')} - {format(addDays(parseISO(weekStart), 6), 'MMM d')}
                </span>
                <button
                  onClick={() => {
                    const nextWeek = format(addDays(parseISO(weekStart), 7), 'yyyy-MM-dd')
                    queryClient.setQueryData(['mealPlan', weekStart], null)
                    queryClient.invalidateQueries({ queryKey: ['mealPlan', nextWeek] })
                  }}
                  className="btn-secondary p-2"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Calendar */}
        {mealPlan && (
          <div className="space-y-4">
            {weekDays.map(({ day, date, label }) => {
              const dayMeals = mealPlan.planned_meals[day] || []
              
              // Calculate daily nutrition totals
              const dailyTotals = dayMeals.reduce((acc, meal) => {
                if (meal.meal_data) {
                  acc.calories += meal.meal_data.calories || 0
                  acc.protein += meal.meal_data.protein || 0
                  acc.carbs += meal.meal_data.carbs || 0
                  acc.fats += meal.meal_data.fats || 0
                }
                return acc
              }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
              
              return (
                <div key={day} className="card-modern p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                      <h2 className="text-sm md:text-base font-bold text-text font-mono uppercase">
                        {label}
                      </h2>
                    </div>
                    {/* Daily Nutrition Totals */}
                    {dayMeals.length > 0 && (
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <div className="flex items-center gap-1">
                          <span className="text-dim">Cal:</span>
                          <span className="text-acid font-bold">{Math.round(dailyTotals.calories)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-dim">P:</span>
                          <span className="text-success font-bold">{Math.round(dailyTotals.protein)}g</span>
                        </div>
                        {dailyTotals.carbs > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-dim">C:</span>
                            <span className="text-text">{Math.round(dailyTotals.carbs)}g</span>
                          </div>
                        )}
                        {dailyTotals.fats > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-dim">F:</span>
                            <span className="text-text">{Math.round(dailyTotals.fats)}g</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {MEAL_TYPES.map((mealType) => {
                      const meals = dayMeals.filter(m => m.meal_type === mealType)
                      
                      return (
                        <div key={mealType} className="border border-border rounded-sm p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono uppercase text-dim">
                              {getMealTypeLabel(mealType)}
                            </span>
                            <button
                              onClick={() => handleAddMeal(day, mealType)}
                              className="btn-secondary text-xs py-1 px-2"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {meals.length > 0 ? (
                            <div className="space-y-2">
                              {meals.map((meal, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-panel rounded-sm group"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {meal.recipe_id ? (
                                      <ChefHat className="w-3 h-3 text-acid flex-shrink-0" />
                                    ) : (
                                      <UtensilsCrossed className="w-3 h-3 text-acid flex-shrink-0" />
                                    )}
                                    <span className="text-xs font-mono text-text truncate">
                                      {meal.meal_data?.name || 'Meal'}
                                    </span>
                                    {meal.meal_data && (
                                      <span className="text-[10px] font-mono text-dim">
                                        {meal.meal_data.calories} cal
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      removeMealMutation.mutate({
                                        planId: mealPlan.id,
                                        day,
                                        index: dayMeals.findIndex(m => m === meal),
                                      })
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-error hover:text-error/80 transition-opacity p-1"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-dim font-mono italic">
                              No meal planned
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Meal Dialog */}
        <Dialog open={showAddMealDialog} onOpenChange={setShowAddMealDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Meal</DialogTitle>
              <DialogDescription>
                Choose a recipe or add a custom meal for {selectedDay}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Meal Type
                </label>
                <select
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value as MealType)}
                  className="input-modern w-full"
                >
                  {MEAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getMealTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecipeSelector(true)}
                  className={`flex-1 py-2 px-4 rounded-sm font-mono uppercase text-xs tracking-wider transition-all ${
                    showRecipeSelector
                      ? 'bg-acid text-black font-bold'
                      : 'bg-panel border border-border text-dim hover:text-text hover:border-acid/50'
                  }`}
                >
                  Choose Recipe
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecipeSelector(false)}
                  className={`flex-1 py-2 px-4 rounded-sm font-mono uppercase text-xs tracking-wider transition-all ${
                    !showRecipeSelector
                      ? 'bg-acid text-black font-bold'
                      : 'bg-panel border border-border text-dim hover:text-text hover:border-acid/50'
                  }`}
                >
                  Custom Meal
                </button>
              </div>

              {showRecipeSelector ? (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {recipes.length > 0 ? (
                    recipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => handleSelectRecipe(recipe)}
                        className="w-full text-left p-3 border border-border rounded-sm hover:border-acid transition-all"
                      >
                        <div className="font-mono font-bold text-sm text-text mb-1">
                          {recipe.name}
                        </div>
                        <div className="text-xs font-mono text-dim">
                          {recipe.nutrition_per_serving.calories} cal • {recipe.nutrition_per_serving.protein}g protein
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-dim font-mono">
                      No recipes available. Create recipes first.
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAddCustomMeal} className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                      Meal Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="input-modern w-full"
                      placeholder="e.g., Grilled Chicken"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Calories *
                      </label>
                      <input
                        type="number"
                        name="calories"
                        required
                        min="0"
                        className="input-modern w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Protein (g) *
                      </label>
                      <input
                        type="number"
                        name="protein"
                        required
                        min="0"
                        className="input-modern w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        name="carbs"
                        min="0"
                        className="input-modern w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Fats (g)
                      </label>
                      <input
                        type="number"
                        name="fats"
                        min="0"
                        className="input-modern w-full"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={addMealMutation.isPending}
                  >
                    {addMealMutation.isPending ? 'Adding...' : 'Add Meal'}
                  </button>
                </form>
              )}
            </div>

            <DialogFooter>
              <button
                onClick={() => setShowAddMealDialog(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  )
}

