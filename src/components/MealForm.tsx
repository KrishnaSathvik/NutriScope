import { useState } from 'react'
import { Meal } from '@/types'
import { UtensilsCrossed, Flame, Beef, Zap, Apple, X, Save } from 'lucide-react'
import { FoodItem } from '@/services/foodDatabase'
import { FoodSearch } from './FoodSearch'
import { validateNumber } from '@/utils/validation'

interface MealFormProps {
  editingMeal?: Meal | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onSaveTemplate?: (mealData: { meal_type: string; calories: number; protein: number; carbs?: number; fats?: number }) => void
  isSubmitting: boolean
  mealTypeLabels: Record<string, string>
}

export function MealForm({ 
  editingMeal, 
  onSubmit, 
  onCancel, 
  onSaveTemplate,
  isSubmitting,
  mealTypeLabels 
}: MealFormProps) {
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    calories?: string
    protein?: string
    carbs?: string
    fats?: string
  }>({})

  const handleFoodSelect = (food: FoodItem) => {
    const form = document.getElementById('meal-form') as HTMLFormElement
    if (form) {
      const caloriesInput = document.getElementById('calories-input') as HTMLInputElement
      const proteinInput = document.getElementById('protein-input') as HTMLInputElement
      const carbsInput = document.getElementById('carbs-input') as HTMLInputElement
      const fatsInput = document.getElementById('fats-input') as HTMLInputElement

      if (caloriesInput) caloriesInput.value = food.calories.toString()
      if (proteinInput) proteinInput.value = food.protein.toString()
      if (carbsInput) carbsInput.value = food.carbs.toString()
      if (fatsInput) fatsInput.value = food.fats.toString()
    }
    setShowFoodSearch(false)
  }

  return (
    <>
        <form onSubmit={onSubmit} className="space-y-4 md:space-y-6" id="meal-form">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs md:text-sm text-dim font-mono">Enter nutrition data manually or search our food database</p>
            <button
              type="button"
              onClick={() => setShowFoodSearch(true)}
              className="btn-secondary gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
            >
              <span>Search Food</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                <UtensilsCrossed className="w-3 h-3 flex-shrink-0" />
                Meal Type
              </label>
              <select
                name="meal_type"
                required
                className="input-modern text-sm md:text-base"
                defaultValue={editingMeal?.meal_type || ''}
              >
                <option value="pre_breakfast">Pre Breakfast</option>
                <option value="breakfast">Breakfast</option>
                <option value="morning_snack">Morning Snack</option>
                <option value="lunch">Lunch</option>
                <option value="evening_snack">Evening Snack</option>
                <option value="dinner">Dinner</option>
                <option value="post_dinner">Post Dinner</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                <UtensilsCrossed className="w-3 h-3 flex-shrink-0" />
                Meal Name <span className="text-dim/50 text-[9px] md:text-[10px]">optional</span>
              </label>
              <input
                type="text"
                name="name"
                className="input-modern text-sm md:text-base"
                placeholder="e.g., Grilled Chicken Salad"
                defaultValue={editingMeal?.name || ''}
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                <Flame className="w-3 h-3 flex-shrink-0" />
                Calories *
              </label>
              <input
                type="number"
                name="calories"
                required
                min="0"
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  const validation = validateNumber(value, { min: 0, max: 10000, label: 'Calories', required: true })
                  if (!validation.isValid) {
                    setValidationErrors(prev => ({ ...prev, calories: validation.error }))
                  } else {
                    setValidationErrors(prev => {
                      const { calories, ...rest } = prev
                      return rest
                    })
                  }
                }}
                className={validationErrors.calories ? 'input-modern text-sm md:text-base border-error' : 'input-modern text-sm md:text-base'}
                placeholder="e.g., 500"
                defaultValue={editingMeal?.calories || ''}
                id="calories-input"
              />
              {validationErrors.calories && (
                <p className="text-[10px] text-error font-mono mt-1">{validationErrors.calories}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                <Beef className="w-3 h-3 text-success flex-shrink-0" />
                Protein (g) *
              </label>
              <input
                type="number"
                name="protein"
                required
                min="0"
                step="0.1"
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  const validation = validateNumber(value, { min: 0, max: 1000, label: 'Protein', required: true })
                  if (!validation.isValid) {
                    setValidationErrors(prev => ({ ...prev, protein: validation.error }))
                  } else {
                    setValidationErrors(prev => {
                      const { protein, ...rest } = prev
                      return rest
                    })
                  }
                }}
                className={validationErrors.protein ? 'input-modern text-sm md:text-base border-error' : 'input-modern text-sm md:text-base'}
                placeholder="e.g., 30"
                defaultValue={editingMeal?.protein || ''}
                id="protein-input"
              />
              {validationErrors.protein && (
                <p className="text-[10px] text-error font-mono mt-1">{validationErrors.protein}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                <Zap className="w-3 h-3 flex-shrink-0" />
                Carbs (g) <span className="text-dim/50 text-[9px] md:text-[10px]">optional</span>
              </label>
              <input
                type="number"
                name="carbs"
                min="0"
                step="0.1"
                onBlur={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined
                  if (value !== undefined) {
                    const validation = validateNumber(value, { min: 0, max: 1000, label: 'Carbs' })
                    if (!validation.isValid) {
                      setValidationErrors(prev => ({ ...prev, carbs: validation.error }))
                    } else {
                      setValidationErrors(prev => {
                        const { carbs, ...rest } = prev
                        return rest
                      })
                    }
                  }
                }}
                className={validationErrors.carbs ? 'input-modern text-sm md:text-base border-error' : 'input-modern text-sm md:text-base'}
                placeholder="Optional"
                defaultValue={editingMeal?.carbs || ''}
                id="carbs-input"
              />
              {validationErrors.carbs && (
                <p className="text-[10px] text-error font-mono mt-1">{validationErrors.carbs}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
                <Apple className="w-3 h-3 flex-shrink-0" />
                Fats (g) <span className="text-dim/50 text-[9px] md:text-[10px]">optional</span>
              </label>
              <input
                type="number"
                name="fats"
                min="0"
                step="0.1"
                onBlur={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined
                  if (value !== undefined) {
                    const validation = validateNumber(value, { min: 0, max: 1000, label: 'Fats' })
                    if (!validation.isValid) {
                      setValidationErrors(prev => ({ ...prev, fats: validation.error }))
                    } else {
                      setValidationErrors(prev => {
                        const { fats, ...rest } = prev
                        return rest
                      })
                    }
                  }
                }}
                className={validationErrors.fats ? 'input-modern text-sm md:text-base border-error' : 'input-modern text-sm md:text-base'}
                placeholder="Optional"
                defaultValue={editingMeal?.fats || ''}
                id="fats-input"
              />
              {validationErrors.fats && (
                <p className="text-[10px] text-error font-mono mt-1">{validationErrors.fats}</p>
              )}
            </div>
          </div>
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-sm">
              <p className="text-xs font-mono text-error mb-2">Please fix the following errors:</p>
              <ul className="space-y-1">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field} className="text-[10px] font-mono text-error">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4 pt-2">
            <button
              type="submit"
              className="btn-primary flex-1 text-sm md:text-base py-2.5 md:py-3"
              disabled={isSubmitting}
            >
              {editingMeal 
                ? (isSubmitting ? 'Updating...' : 'Update Meal')
                : (isSubmitting ? 'Adding...' : 'Add Meal')
              }
            </button>
            {!editingMeal && onSaveTemplate && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget.closest('form')
                  if (!form) return
                  
                  const formData = new FormData(form)
                  const mealType = formData.get('meal_type') as string
                  const calories = Number(formData.get('calories'))
                  const protein = Number(formData.get('protein'))
                  const carbsValue = formData.get('carbs')
                  const fatsValue = formData.get('fats')
                  
                  onSaveTemplate({
                    meal_type: mealType,
                    calories,
                    protein,
                    carbs: carbsValue ? Number(carbsValue) : undefined,
                    fats: fatsValue ? Number(fatsValue) : undefined,
                  })
                }}
                disabled={isSubmitting}
                className="btn-secondary gap-2"
                title="Save this meal as a template"
              >
                <Save className="w-4 h-4" />
                <span>Save Template</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>

      {/* Food Search Dialog */}
      {showFoodSearch && (
        <FoodSearch
          onSelectFood={handleFoodSelect}
          onClose={() => setShowFoodSearch(false)}
        />
      )}
    </>
  )
}

