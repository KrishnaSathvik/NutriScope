import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, scaleRecipe } from '@/services/recipes'
import { Recipe, RecipeIngredient } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, X, Edit, ChefHat, Clock, Users, Scale, Star, StarOff } from 'lucide-react'
import PullToRefresh from '@/components/PullToRefresh'
import { format } from 'date-fns'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function RecipesPage() {
  const { user } = useAuth()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [showScaleDialog, setShowScaleDialog] = useState(false)
  const [scalingRecipe, setScalingRecipe] = useState<Recipe | null>(null)
  const [newServings, setNewServings] = useState(4)
  const queryClient = useQueryClient()

  // Set up realtime subscription for recipes
  useUserRealtimeSubscription('recipes', ['recipes'], user?.id)

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
    enabled: !!user,
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
    },
  })

  const editingRecipe = editingRecipeId ? recipes.find(r => r.id === editingRecipeId) : null

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['recipes'] })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const ingredients: RecipeIngredient[] = []
    const ingredientNames = formData.getAll('ingredient_name') as string[]
    const ingredientQuantities = formData.getAll('ingredient_quantity') as string[]
    const ingredientUnits = formData.getAll('ingredient_unit') as string[]

    for (let i = 0; i < ingredientNames.length; i++) {
      if (ingredientNames[i].trim()) {
        ingredients.push({
          name: ingredientNames[i],
          quantity: Number(ingredientQuantities[i]) || 0,
          unit: ingredientUnits[i] || 'g',
        })
      }
    }

    const instructions = (formData.get('instructions') as string)
      ?.split('\n')
      .filter(line => line.trim())
      || []

    const recipeData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      servings: Number(formData.get('servings')) || 1,
      prep_time: formData.get('prep_time') ? Number(formData.get('prep_time')) : undefined,
      cook_time: formData.get('cook_time') ? Number(formData.get('cook_time')) : undefined,
      ingredients,
      instructions,
      tags: (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || [],
      is_favorite: false,
      nutrition_per_serving: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      },
    }

    if (editingRecipeId) {
      updateMutation.mutate({ id: editingRecipeId, updates: recipeData })
    } else {
      createMutation.mutate(recipeData)
    }
  }

  const handleScale = () => {
    if (!scalingRecipe) return
    const scaled = scaleRecipe(scalingRecipe, newServings)
    updateMutation.mutate({
      id: scalingRecipe.id,
      updates: {
        servings: scaled.servings,
        ingredients: scaled.ingredients,
        nutrition_per_serving: scaled.nutrition_per_serving,
      },
    })
    setShowScaleDialog(false)
    setScalingRecipe(null)
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
                Recipes
              </h1>
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
        </div>

        {/* Add/Edit Recipe Form */}
        {(showAddForm || editingRecipeId) && (
          <div className="card-modern border-acid/30 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                {editingRecipeId ? 'Edit Recipe' : 'New Recipe'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingRecipeId(null)
                }}
                className="text-dim hover:text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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

              {/* Ingredients */}
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Ingredients *
                </label>
                <div id="ingredients-list" className="space-y-2">
                  {(editingRecipe?.ingredients.length || 0) > 0 ? (
                    editingRecipe!.ingredients.map((ing, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          name="ingredient_name"
                          required
                          className="input-modern col-span-5"
                          defaultValue={ing.name}
                          placeholder="Ingredient"
                        />
                        <input
                          type="number"
                          name="ingredient_quantity"
                          required
                          min="0"
                          step="0.01"
                          className="input-modern col-span-3"
                          defaultValue={ing.quantity}
                          placeholder="Qty"
                        />
                        <select
                          name="ingredient_unit"
                          className="input-modern col-span-2"
                          defaultValue={ing.unit}
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="cup">cup</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="piece">piece</option>
                        </select>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            const list = document.getElementById('ingredients-list')
                            if (list && e.currentTarget.parentElement) {
                              list.removeChild(e.currentTarget.parentElement)
                            }
                          }}
                          className="btn-secondary col-span-2 text-xs px-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        name="ingredient_name"
                        required
                        className="input-modern col-span-5"
                        placeholder="Ingredient"
                      />
                      <input
                        type="number"
                        name="ingredient_quantity"
                        required
                        min="0"
                        step="0.01"
                        className="input-modern col-span-3"
                        placeholder="Qty"
                      />
                      <select name="ingredient_unit" className="input-modern col-span-2">
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="cup">cup</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="piece">piece</option>
                      </select>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    const list = document.getElementById('ingredients-list')
                    if (list) {
                      const newRow = document.createElement('div')
                      newRow.className = 'grid grid-cols-12 gap-2'
                      newRow.innerHTML = `
                        <input type="text" name="ingredient_name" class="input-modern col-span-5" placeholder="Ingredient" />
                        <input type="number" name="ingredient_quantity" min="0" step="0.01" class="input-modern col-span-3" placeholder="Qty" />
                        <select name="ingredient_unit" class="input-modern col-span-2">
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="cup">cup</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="piece">piece</option>
                        </select>
                        <button type="button" onclick="this.parentElement.remove()" class="btn-secondary col-span-2 text-xs px-2">Remove</button>
                      `
                      list.appendChild(newRow)
                    }
                  }}
                  className="btn-secondary text-xs mt-2"
                >
                  + Add Ingredient
                </button>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  Instructions (one per line) *
                </label>
                <textarea
                  name="instructions"
                  required
                  className="input-modern"
                  rows={6}
                  defaultValue={editingRecipe?.instructions.join('\n') || ''}
                  placeholder="Step 1: ...&#10;Step 2: ..."
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
                  defaultValue={editingRecipe?.tags.join(', ') || ''}
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
          </div>
        )}

        {/* Recipes List */}
        {isLoading ? (
          <div className="text-center py-12 text-dim font-mono text-xs">Loading recipes...</div>
        ) : recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="card-modern group hover:border-acid/50 transition-all p-4 md:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ChefHat className="w-4 h-4 text-acid flex-shrink-0" />
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
                    onClick={() => {
                      toggleFavoriteMutation.mutate({
                        id: recipe.id,
                        isFavorite: recipe.is_favorite,
                      })
                    }}
                    className="text-dim hover:text-acid transition-colors flex-shrink-0 ml-2"
                  >
                    {recipe.is_favorite ? (
                      <Star className="w-5 h-5 fill-acid text-acid" />
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
                    <div className="text-xs font-bold text-orange-500 dark:text-acid font-mono">
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

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingRecipeId(recipe.id)
                      setShowAddForm(true)
                    }}
                    className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setScalingRecipe(recipe)
                      setNewServings(recipe.servings)
                      setShowScaleDialog(true)
                    }}
                    className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1"
                    title="Scale recipe"
                  >
                    <Scale className="w-3 h-3" />
                    Scale
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(recipe.id)}
                    className="btn-secondary text-xs py-2 px-3 text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-modern text-center border-dashed py-12 md:py-16 px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-acid/10 border border-acid/20 flex items-center justify-center mx-auto mb-6 md:mb-8">
              <ChefHat className="w-8 h-8 md:w-10 md:h-10 text-acid/60" />
            </div>
            <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">No recipes yet</h3>
            <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
              Create your first recipe to save time and track nutrition accurately
            </p>
            <button
              onClick={() => {
                setEditingRecipeId(null)
                setShowAddForm(true)
              }}
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm md:text-base py-2.5 md:py-3 px-4 md:px-6"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span>Create Recipe</span>
            </button>
          </div>
        )}

        {/* Scale Recipe Dialog */}
        <Dialog open={showScaleDialog} onOpenChange={setShowScaleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scale Recipe</DialogTitle>
              <DialogDescription>
                Adjust the serving size. Ingredients and nutrition will be automatically calculated.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  New Serving Size
                </label>
                <input
                  type="number"
                  min="1"
                  value={newServings}
                  onChange={(e) => setNewServings(Number(e.target.value) || 1)}
                  className="input-modern w-full"
                />
                {scalingRecipe && (
                  <div className="text-xs text-dim font-mono mt-2">
                    Current: {scalingRecipe.servings} servings
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowScaleDialog(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleScale}
                className="btn-primary"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Scaling...' : 'Scale Recipe'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  )
}

