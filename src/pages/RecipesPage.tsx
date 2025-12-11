import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getRecipes, createRecipe, updateRecipe, deleteRecipe } from '@/services/recipes'
import { getRecipesByGoalAndCuisine, convertLibraryRecipeToUserRecipe, RecipeLibraryItem } from '@/services/recipeLibrary'
import { createMealTemplate } from '@/services/mealTemplates'
import { Recipe, MealType } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, X, Edit, ChefHat, Clock, Users, Save, Star, StarOff, Flame, Eye, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function RecipesPage() {
  const { user } = useAuth()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [recipeToSaveAsTemplate, setRecipeToSaveAsTemplate] = useState<Recipe | null>(null)
  const [templateMealType, setTemplateMealType] = useState<MealType>('lunch')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [selectedLibraryRecipe, setSelectedLibraryRecipe] = useState<RecipeLibraryItem | null>(null)
  const [showMyRecipes, setShowMyRecipes] = useState(false) // Show user's own recipes instead of library
  const [selectedGoalType, setSelectedGoalType] = useState<'lose_weight' | 'gain_muscle' | 'gain_weight' | 'improve_fitness' | 'maintain' | 'all'>('all')
  const [selectedCuisine, setSelectedCuisine] = useState<'indian' | 'italian' | 'american' | 'mexican' | 'mediterranean' | 'asian' | 'other' | 'all'>('all')
  const queryClient = useQueryClient()

  // Set up realtime subscription for recipes
  useUserRealtimeSubscription('recipes', ['recipes'], user?.id)

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
    enabled: !!user && showMyRecipes, // Only fetch user recipes when showing "My Recipes"
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Fetch library recipes based on filters (shown by default)
  const { data: libraryRecipes = [], isLoading: isLoadingLibrary } = useQuery({
    queryKey: ['recipeLibrary', selectedGoalType, selectedCuisine],
    queryFn: () => {
      const goalType = selectedGoalType === 'all' ? undefined : selectedGoalType
      const cuisine = selectedCuisine === 'all' ? undefined : selectedCuisine
      return getRecipesByGoalAndCuisine(goalType, cuisine)
    },
    enabled: !showMyRecipes, // Show library when not showing user recipes
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const createMutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      setShowAddForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Recipe> }) => updateRecipe(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      setShowAddForm(false)
      setEditingRecipeId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      updateRecipe(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.refetchQueries({ queryKey: ['recipes'] })
    },
    onError: (error) => {
      console.error('Error toggling favorite:', error)
    },
  })

  const editingRecipe = editingRecipeId ? recipes.find(r => r.id === editingRecipeId) : null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const instructions = (formData.get('instructions') as string)?.trim() || ''

    const recipeData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      servings: Number(formData.get('servings')) || 1,
      prep_time: formData.get('prep_time') ? Number(formData.get('prep_time')) : undefined,
      cook_time: formData.get('cook_time') ? Number(formData.get('cook_time')) : undefined,
      instructions,
      tags: (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || [],
      is_favorite: false,
      nutrition_per_serving: {
        calories: Number(formData.get('calories')) || 0,
        protein: Number(formData.get('protein')) || 0,
        carbs: Number(formData.get('carbs')) || 0,
        fats: Number(formData.get('fats')) || 0,
      },
    }

    if (editingRecipeId) {
      updateMutation.mutate({ id: editingRecipeId, updates: recipeData })
    } else {
      createMutation.mutate(recipeData)
    }
  }

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ recipe, mealType }: { recipe: Recipe; mealType: MealType }) => {
      if (!user?.id) throw new Error('Not authenticated')
      return createMealTemplate(user.id, {
        name: recipe.name,
        description: recipe.description,
        meal_type: mealType,
        calories: recipe.nutrition_per_serving.calories,
        protein: recipe.nutrition_per_serving.protein,
        carbs: recipe.nutrition_per_serving.carbs,
        fats: recipe.nutrition_per_serving.fats,
        image_url: recipe.image_url,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplates'] })
      setShowSaveTemplateDialog(false)
      setRecipeToSaveAsTemplate(null)
    },
  })

  const handleSaveToTemplate = () => {
    if (!recipeToSaveAsTemplate) return
    saveTemplateMutation.mutate({ recipe: recipeToSaveAsTemplate, mealType: templateMealType })
  }

  return (
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
        {/* Header */}
        <div className="border-b border-border pb-4 md:pb-6">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div className="h-px w-6 md:w-8 bg-acid"></div>
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">
                Recipes
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMyRecipes(!showMyRecipes)}
                  className={`btn-secondary gap-2 text-xs md:text-sm px-3 md:px-4 py-2 ${
                    showMyRecipes ? 'bg-accent/20 border-accent/50 text-accent' : ''
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span className="hidden sm:inline">{showMyRecipes ? 'Recipe Library' : 'My Recipes'}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingRecipeId(null)
                    setShowAddForm(true)
                  }}
                  className="btn-secondary gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Recipe</span>
                </button>
              </div>
            </div>

            {/* Recipe Library Filters - Always visible when showing library */}
            {!showMyRecipes && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-2">
                    <Filter className="w-3 h-3" />
                    Goal Type
                  </label>
                  <select
                    value={selectedGoalType}
                    onChange={(e) => setSelectedGoalType(e.target.value as typeof selectedGoalType)}
                    className="input-modern text-sm md:text-base w-full"
                  >
                    <option value="all">All Goals</option>
                    <option value="lose_weight">Lose Weight</option>
                    <option value="gain_muscle">Gain Muscle</option>
                    <option value="gain_weight">Gain Weight</option>
                    <option value="improve_fitness">Improve Fitness</option>
                    <option value="maintain">Maintain Weight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-2">
                    <ChefHat className="w-3 h-3" />
                    Cuisine
                  </label>
                  <select
                    value={selectedCuisine}
                    onChange={(e) => setSelectedCuisine(e.target.value as typeof selectedCuisine)}
                    className="input-modern text-sm md:text-base w-full"
                  >
                    <option value="all">All Cuisines</option>
                    <option value="indian">Indian</option>
                    <option value="italian">Italian</option>
                    <option value="american">American</option>
                    <option value="mexican">Mexican</option>
                    <option value="mediterranean">Mediterranean</option>
                    <option value="asian">Asian</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Recipe Form Dialog */}
        <Dialog open={showAddForm || !!editingRecipeId} onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingRecipeId(null)
          }
        }}>
          <DialogContent className="w-full h-full max-w-full max-h-full sm:h-[95vh] sm:max-h-[95vh] sm:w-[95vw] sm:max-w-[95vw] sm:m-4 p-4 md:p-6 lg:p-8 overflow-y-auto scrollbar-hide translate-x-0 translate-y-0 left-0 top-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]" hideClose={true}>
            <DialogHeader>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <DialogTitle className="text-lg md:text-2xl font-bold text-text uppercase tracking-widest font-mono">
                  {editingRecipeId ? 'Edit Recipe' : 'New Recipe'}
                </DialogTitle>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingRecipeId(null)
                  }}
                  className="text-dim hover:text-text transition-colors p-1"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="input-modern"
                    defaultValue={editingRecipe?.name || ''}
                    placeholder="e.g., Chicken Stir Fry"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                    Servings *
                  </label>
                  <input
                    type="number"
                    name="servings"
                    required
                    min="1"
                    className="input-modern"
                    defaultValue={editingRecipe?.servings || 4}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  className="input-modern"
                  rows={2}
                  defaultValue={editingRecipe?.description || ''}
                  placeholder="Brief description of the recipe"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="prep_time"
                    min="0"
                    className="input-modern"
                    defaultValue={editingRecipe?.prep_time || ''}
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Cook Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="cook_time"
                    min="0"
                    className="input-modern"
                    defaultValue={editingRecipe?.cook_time || ''}
                  />
                </div>
              </div>

              {/* Nutrition Info */}
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Nutrition Per Serving *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      name="calories"
                      required
                      min="0"
                      className="input-modern"
                      defaultValue={editingRecipe?.nutrition_per_serving.calories || 0}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      name="protein"
                      required
                      min="0"
                      step="0.1"
                      className="input-modern"
                      defaultValue={editingRecipe?.nutrition_per_serving.protein || 0}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      name="carbs"
                      required
                      min="0"
                      step="0.1"
                      className="input-modern"
                      defaultValue={editingRecipe?.nutrition_per_serving.carbs || 0}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-dim mb-1">
                      Fats (g)
                    </label>
                    <input
                      type="number"
                      name="fats"
                      required
                      min="0"
                      step="0.1"
                      className="input-modern"
                      defaultValue={editingRecipe?.nutrition_per_serving.fats || 0}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Instructions *
                </label>
                <textarea
                  name="instructions"
                  required
                  className="input-modern"
                  rows={8}
                  defaultValue={editingRecipe?.instructions || ''}
                  placeholder="Type your recipe instructions here. You can use paragraphs or numbered steps:&#10;&#10;1. First step...&#10;2. Second step...&#10;&#10;Or write in paragraphs for a more detailed description."
                />
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Tags (comma-separated)
                </label>
                  <input
                    type="text"
                    name="tags"
                    className="input-modern"
                    defaultValue={editingRecipe?.tags && Array.isArray(editingRecipe.tags) ? editingRecipe.tags.join(', ') : ''}
                    placeholder="e.g., dinner, healthy, quick"
                  />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingRecipeId
                    ? (updateMutation.isPending ? 'Updating...' : 'Update Recipe')
                    : (createMutation.isPending ? 'Creating...' : 'Create Recipe')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingRecipeId(null)
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Recipes List */}
        {showMyRecipes ? (
          // User's Own Recipes View
          isLoading ? (
            <div className="text-center py-12 text-dim font-mono text-xs">Loading recipes...</div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  className="card-modern group hover:border-accent/50 transition-all p-4 md:p-6 cursor-pointer"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ChefHat className="w-4 h-4 text-accent flex-shrink-0" />
                        <h3 className="text-base md:text-lg font-bold text-text font-mono uppercase truncate">
                          {recipe.name}
                        </h3>
                      </div>
                      {recipe.description && (
                        <p className="text-xs text-dim font-mono line-clamp-2 mb-2">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavoriteMutation.mutate({
                          id: recipe.id,
                          isFavorite: recipe.is_favorite,
                        })
                      }}
                      className="text-dim hover:text-accent transition-colors flex-shrink-0 ml-2"
                    >
                      {recipe.is_favorite ? (
                        <Star className="w-5 h-5 fill-accent text-accent" />
                      ) : (
                        <StarOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-dim" />
                      <span className="text-dim">{recipe.servings} servings</span>
                    </div>
                    {(recipe.prep_time || recipe.cook_time) && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-dim" />
                        <span className="text-dim">
                          {((recipe.prep_time || 0) + (recipe.cook_time || 0))} min
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4 p-2 bg-panel rounded-sm">
                    <div className="text-center">
                      <div className="text-xs font-bold text-orange-500 dark:text-accent font-mono">
                        {recipe.nutrition_per_serving.calories}
                      </div>
                      <div className="text-[10px] text-dim font-mono">cal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-success font-mono">
                        {recipe.nutrition_per_serving.protein}g
                      </div>
                      <div className="text-[10px] text-dim font-mono">protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-yellow-500 dark:text-text font-mono">
                        {recipe.nutrition_per_serving.carbs}g
                      </div>
                      <div className="text-[10px] text-dim font-mono">carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-amber-500 dark:text-text font-mono">
                        {recipe.nutrition_per_serving.fats}g
                      </div>
                      <div className="text-[10px] text-dim font-mono">fats</div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRecipe(recipe)
                    }}
                    className="btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 hover:bg-accent/10 hover:text-accent transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-modern text-center border-dashed py-12 md:py-16 px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6 md:mb-8">
                <ChefHat className="w-8 h-8 md:w-10 md:h-10 text-accent/60" />
              </div>
              <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">No recipes yet</h3>
              <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
                Create your first recipe to save time and track nutrition accurately
              </p>
            </div>
          )
        ) : (
          // Recipe Library View (shown by default)
          isLoadingLibrary ? (
            <div className="text-center py-12 text-dim font-mono text-xs">Loading recipe library...</div>
          ) : libraryRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {libraryRecipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  className="card-modern group hover:border-accent/50 transition-all p-4 md:p-6 cursor-pointer"
                  onClick={() => setSelectedLibraryRecipe(recipe)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ChefHat className="w-4 h-4 text-accent flex-shrink-0" />
                        <h3 className="text-base md:text-lg font-bold text-text font-mono uppercase truncate">
                          {recipe.name}
                        </h3>
                      </div>
                      {recipe.description && (
                        <p className="text-xs text-dim font-mono line-clamp-2 mb-2">
                          {recipe.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[9px] text-dim font-mono px-1.5 py-0.5 bg-border rounded">
                          {recipe.goal_type.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-dim font-mono px-1.5 py-0.5 bg-border rounded">
                          {recipe.cuisine}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-dim" />
                      <span className="text-dim">{recipe.servings} servings</span>
                    </div>
                    {(recipe.prep_time || recipe.cook_time) && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-dim" />
                        <span className="text-dim">
                          {((recipe.prep_time || 0) + (recipe.cook_time || 0))} min
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4 p-2 bg-panel rounded-sm">
                    <div className="text-center">
                      <div className="text-xs font-bold text-orange-500 dark:text-accent font-mono">
                        {recipe.nutrition_per_serving.calories}
                      </div>
                      <div className="text-[10px] text-dim font-mono">cal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-success font-mono">
                        {recipe.nutrition_per_serving.protein}g
                      </div>
                      <div className="text-[10px] text-dim font-mono">protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-yellow-500 dark:text-text font-mono">
                        {recipe.nutrition_per_serving.carbs}g
                      </div>
                      <div className="text-[10px] text-dim font-mono">carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-amber-500 dark:text-text font-mono">
                        {recipe.nutrition_per_serving.fats}g
                      </div>
                      <div className="text-[10px] text-dim font-mono">fats</div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedLibraryRecipe(recipe)
                    }}
                    className="btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 hover:bg-accent/10 hover:text-accent transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Recipe</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-modern text-center border-dashed py-12 md:py-16 px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6 md:mb-8">
                <ChefHat className="w-8 h-8 md:w-10 md:h-10 text-accent/60" />
              </div>
              <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">No recipes found</h3>
              <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
                Try adjusting your filters to see more recipes
              </p>
            </div>
          )
        )}

        {/* Save to Template Dialog */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30">
                  <Save className="w-5 h-5 text-acid" />
                </div>
                <DialogTitle className="text-lg font-bold text-text uppercase tracking-widest font-mono">
                  Save as Template
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-dim font-mono">
                Save this recipe as a meal template for quick logging. Select the meal type.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {recipeToSaveAsTemplate && (
                <div className="p-4 bg-panel border border-border rounded-sm">
                  <div className="font-mono text-base font-bold text-text mb-2">{recipeToSaveAsTemplate.name}</div>
                  <div className="grid grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <div className="text-dim">Calories</div>
                      <div className="text-text font-bold">{recipeToSaveAsTemplate.nutrition_per_serving.calories}</div>
                    </div>
                    <div>
                      <div className="text-dim">Protein</div>
                      <div className="text-text font-bold">{recipeToSaveAsTemplate.nutrition_per_serving.protein}g</div>
                    </div>
                    <div>
                      <div className="text-dim">Carbs</div>
                      <div className="text-text font-bold">{recipeToSaveAsTemplate.nutrition_per_serving.carbs}g</div>
                    </div>
                    <div>
                      <div className="text-dim">Fats</div>
                      <div className="text-text font-bold">{recipeToSaveAsTemplate.nutrition_per_serving.fats}g</div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Meal Type *
                </label>
                <select
                  value={templateMealType}
                  onChange={(e) => setTemplateMealType(e.target.value as MealType)}
                  className="input-modern w-full text-sm"
                >
                  <option value="pre_breakfast">Pre-Breakfast</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="morning_snack">Morning Snack</option>
                  <option value="lunch">Lunch</option>
                  <option value="evening_snack">Evening Snack</option>
                  <option value="dinner">Dinner</option>
                  <option value="post_dinner">Post-Dinner</option>
                </select>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveTemplateDialog(false)
                  setRecipeToSaveAsTemplate(null)
                }}
                className="btn-secondary"
                disabled={saveTemplateMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToTemplate}
                className="btn-primary flex items-center gap-2"
                disabled={saveTemplateMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ChefHat className="w-5 h-5 text-acid" />
                      <DialogTitle className="text-2xl md:text-3xl font-bold text-text font-mono uppercase">
                        {selectedRecipe.name}
                      </DialogTitle>
                    </div>
                    {selectedRecipe.description && (
                      <DialogDescription className="text-sm text-dim font-mono mt-2">
                        {selectedRecipe.description}
                      </DialogDescription>
                    )}
                  </div>
                </div>
                {/* Favorite button - positioned separately below title, left-aligned */}
                <div className="flex items-center justify-start mb-4 -mt-2">
                  <button
                    onClick={() => {
                      toggleFavoriteMutation.mutate({
                        id: selectedRecipe.id,
                        isFavorite: selectedRecipe.is_favorite,
                      })
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-colors bg-panel hover:bg-acid/10 hover:border-acid/50"
                    title={selectedRecipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {selectedRecipe.is_favorite ? (
                      <>
                        <Star className="w-4 h-4 fill-acid text-acid" />
                        <span className="text-xs font-mono uppercase text-acid">Favorited</span>
                      </>
                    ) : (
                      <>
                        <StarOff className="w-4 h-4 text-dim" />
                        <span className="text-xs font-mono uppercase text-dim">Add to Favorites</span>
                      </>
                    )}
                  </button>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Recipe Image */}
                {selectedRecipe.image_url && (
                  <div className="w-full h-48 md:h-64 rounded-sm overflow-hidden border border-border">
                    <img 
                      src={selectedRecipe.image_url} 
                      alt={selectedRecipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Recipe Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-panel rounded-sm border border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-acid" />
                    <div>
                      <div className="text-xs text-dim font-mono uppercase">Servings</div>
                      <div className="text-sm font-bold text-text font-mono">{selectedRecipe.servings}</div>
                    </div>
                  </div>
                  {selectedRecipe.prep_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-acid" />
                      <div>
                        <div className="text-xs text-dim font-mono uppercase">Prep Time</div>
                        <div className="text-sm font-bold text-text font-mono">{selectedRecipe.prep_time} min</div>
                      </div>
                    </div>
                  )}
                  {selectedRecipe.cook_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-acid" />
                      <div>
                        <div className="text-xs text-dim font-mono uppercase">Cook Time</div>
                        <div className="text-sm font-bold text-text font-mono">{selectedRecipe.cook_time} min</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nutrition Information */}
                <div className="p-4 bg-panel rounded-sm border border-border">
                  <h3 className="text-sm font-bold text-text font-mono uppercase mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-acid" />
                    Nutrition Per Serving
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-500 dark:text-acid font-mono">
                        {selectedRecipe.nutrition_per_serving.calories}
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Calories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-success font-mono">
                        {selectedRecipe.nutrition_per_serving.protein}g
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-500 dark:text-text font-mono">
                        {selectedRecipe.nutrition_per_serving.carbs}g
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-500 dark:text-text font-mono">
                        {selectedRecipe.nutrition_per_serving.fats}g
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Fats</div>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                {selectedRecipe.instructions && (
                  <div className="p-4 bg-panel rounded-sm border border-border">
                    <h3 className="text-sm font-bold text-text font-mono uppercase mb-3 flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-acid" />
                      Instructions
                    </h3>
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm text-text font-mono whitespace-pre-wrap leading-relaxed">
                        {(() => {
                          // Handle both string and array formats
                          let instructionsText = ''
                          if (typeof selectedRecipe.instructions === 'string') {
                            instructionsText = selectedRecipe.instructions
                          } else if (Array.isArray(selectedRecipe.instructions)) {
                            instructionsText = (selectedRecipe.instructions as string[]).join('\n')
                          } else {
                            instructionsText = String(selectedRecipe.instructions || '')
                          }

                          return instructionsText.split('\n').map((step, index) => {
                            // Check if step starts with a number (e.g., "1.", "2.", etc.)
                            const isNumbered = /^\d+[\.\)]\s/.test(step.trim())
                            if (isNumbered || step.trim()) {
                              return (
                                <div key={index} className="mb-3 flex gap-3">
                                  {isNumbered ? (
                                    <>
                                      <span className="text-acid font-bold flex-shrink-0">{step.match(/^\d+[\.\)]/)?.[0]}</span>
                                      <span className="flex-1">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                                    </>
                                  ) : (
                                    <span className="flex-1">{step}</span>
                                  )}
                                </div>
                              )
                            }
                            return null
                          })
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-mono uppercase bg-acid/10 text-acid border border-acid/30 rounded-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <DialogFooter className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setEditingRecipeId(selectedRecipe.id)
                      setSelectedRecipe(null)
                      setShowAddForm(true)
                    }}
                    className="btn-secondary flex-1 text-xs md:text-sm py-2.5 flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setRecipeToSaveAsTemplate(selectedRecipe)
                      setTemplateMealType('lunch')
                      setSelectedRecipe(null)
                      setShowSaveTemplateDialog(true)
                    }}
                    className="btn-secondary flex-1 text-xs md:text-sm py-2.5 flex items-center justify-center gap-2 hover:bg-acid/10 hover:text-acid"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Template</span>
                  </button>
                  <button
                    onClick={() => {
                      deleteMutation.mutate(selectedRecipe.id)
                      setSelectedRecipe(null)
                    }}
                    className="btn-secondary text-xs md:text-sm py-2.5 px-4 text-error hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Library Recipe Detail Dialog */}
      <Dialog open={!!selectedLibraryRecipe} onOpenChange={(open) => !open && setSelectedLibraryRecipe(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLibraryRecipe && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ChefHat className="w-5 h-5 text-accent" />
                      <DialogTitle className="text-2xl md:text-3xl font-bold text-text font-mono uppercase">
                        {selectedLibraryRecipe.name}
                      </DialogTitle>
                    </div>
                    {selectedLibraryRecipe.description && (
                      <DialogDescription className="text-sm text-dim font-mono mt-2">
                        {selectedLibraryRecipe.description}
                      </DialogDescription>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs text-dim font-mono px-2 py-1 bg-panel border border-border rounded">
                        {selectedLibraryRecipe.goal_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-dim font-mono px-2 py-1 bg-panel border border-border rounded">
                        {selectedLibraryRecipe.cuisine}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Recipe Image */}
                {selectedLibraryRecipe.image_url && (
                  <div className="w-full h-48 md:h-64 rounded-sm overflow-hidden border border-border">
                    <img 
                      src={selectedLibraryRecipe.image_url} 
                      alt={selectedLibraryRecipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Recipe Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-panel rounded-sm border border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <div>
                      <div className="text-xs text-dim font-mono uppercase">Servings</div>
                      <div className="text-sm font-bold text-text font-mono">{selectedLibraryRecipe.servings}</div>
                    </div>
                  </div>
                  {selectedLibraryRecipe.prep_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" />
                      <div>
                        <div className="text-xs text-dim font-mono uppercase">Prep Time</div>
                        <div className="text-sm font-bold text-text font-mono">{selectedLibraryRecipe.prep_time} min</div>
                      </div>
                    </div>
                  )}
                  {selectedLibraryRecipe.cook_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" />
                      <div>
                        <div className="text-xs text-dim font-mono uppercase">Cook Time</div>
                        <div className="text-sm font-bold text-text font-mono">{selectedLibraryRecipe.cook_time} min</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nutrition Information */}
                <div className="p-4 bg-panel rounded-sm border border-border">
                  <h3 className="text-sm font-bold text-text font-mono uppercase mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-accent" />
                    Nutrition Per Serving
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-500 dark:text-accent font-mono">
                        {selectedLibraryRecipe.nutrition_per_serving.calories}
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Calories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-success font-mono">
                        {selectedLibraryRecipe.nutrition_per_serving.protein}g
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-500 dark:text-text font-mono">
                        {selectedLibraryRecipe.nutrition_per_serving.carbs}g
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-500 dark:text-text font-mono">
                        {selectedLibraryRecipe.nutrition_per_serving.fats}g
                      </div>
                      <div className="text-xs text-dim font-mono uppercase">Fats</div>
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                {selectedLibraryRecipe.ingredients && selectedLibraryRecipe.ingredients.length > 0 && (
                  <div className="p-4 bg-panel rounded-sm border border-border">
                    <h3 className="text-sm font-bold text-text font-mono uppercase mb-3 flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-accent" />
                      Ingredients
                    </h3>
                    <ul className="space-y-2">
                      {selectedLibraryRecipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="text-sm text-text font-mono flex items-center gap-2">
                          <span className="text-accent">•</span>
                          <span>{ingredient.name}: {ingredient.quantity} {ingredient.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {selectedLibraryRecipe.instructions && (
                  <div className="p-4 bg-panel rounded-sm border border-border">
                    <h3 className="text-sm font-bold text-text font-mono uppercase mb-3 flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-accent" />
                      Instructions
                    </h3>
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm text-text font-mono whitespace-pre-wrap leading-relaxed">
                        {selectedLibraryRecipe.instructions.split('\n').map((step, index) => {
                          const isNumbered = /^\d+[\.\)]\s/.test(step.trim())
                          if (isNumbered || step.trim()) {
                            return (
                              <div key={index} className="mb-3 flex gap-3">
                                {isNumbered ? (
                                  <>
                                    <span className="text-accent font-bold flex-shrink-0">{step.match(/^\d+[\.\)]/)?.[0]}</span>
                                    <span className="flex-1">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                                  </>
                                ) : (
                                  <span className="flex-1">{step}</span>
                                )}
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedLibraryRecipe.tags && selectedLibraryRecipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedLibraryRecipe.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-mono uppercase bg-accent/10 text-accent border border-accent/30 rounded-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <DialogFooter className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      if (!user?.id) return
                      const recipeData = convertLibraryRecipeToUserRecipe(selectedLibraryRecipe, user.id)
                      createMutation.mutate(recipeData as any)
                      setSelectedLibraryRecipe(null)
                    }}
                    className="btn-primary flex-1 text-xs md:text-sm py-2.5 flex items-center justify-center gap-2"
                    disabled={createMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                    {createMutation.isPending ? 'Saving...' : 'Save to My Recipes'}
                  </button>
                  <button
                    onClick={() => {
                      if (!user?.id || !selectedLibraryRecipe) return
                      const recipeData = convertLibraryRecipeToUserRecipe(selectedLibraryRecipe, user.id)
                      setRecipeToSaveAsTemplate(recipeData as any)
                      setTemplateMealType('lunch')
                      setSelectedLibraryRecipe(null)
                      setShowSaveTemplateDialog(true)
                    }}
                    className="btn-secondary flex-1 text-xs md:text-sm py-2.5 flex items-center justify-center gap-2 hover:bg-accent/10 hover:text-accent"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save as Template</span>
                  </button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
  )
}

