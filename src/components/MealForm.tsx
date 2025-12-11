import { useState, useEffect, useRef } from 'react'
import { Meal, MealType } from '@/types'
import { UtensilsCrossed, Flame, Beef, Zap, Apple, X, Save, Search } from 'lucide-react'
import { FoodItem } from '@/services/foodDatabase'
import { FoodSearch } from './FoodSearch'
import { MealSelector } from './MealSelector'
import { MealLibraryItem, calculateMealNutrition } from '@/services/mealLibrary'
import { validateNumber } from '@/utils/validation'

interface MealFormProps {
  editingMeal?: Meal | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onSaveTemplate?: (mealData: { meal_type: string; calories: number; protein: number; carbs?: number; fats?: number }) => void
  isSubmitting: boolean
  mealTypeLabels?: Record<string, string> // Optional, kept for backward compatibility
}

export function MealForm({ 
  editingMeal, 
  onSubmit, 
  onCancel, 
  onSaveTemplate,
  isSubmitting,
  mealTypeLabels: _mealTypeLabels // Kept for backward compatibility but not used in this component
}: MealFormProps) {
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [showMealSelector, setShowMealSelector] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<MealLibraryItem | null>(null)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [foodQuantity, setFoodQuantity] = useState<number | string>(1)
  const [quantity, setQuantity] = useState<number | string>(1)
  const [calculatedNutrition, setCalculatedNutrition] = useState<{
    calories: number
    protein: number
    carbs: number
    fats: number
  } | null>(null)
  const [manualNutrition, setManualNutrition] = useState<{
    calories?: number
    protein?: number
    carbs?: number
    fats?: number
  }>({})
  const formRef = useRef<HTMLFormElement>(null)
  const [validationErrors, setValidationErrors] = useState<{
    calories?: string
    protein?: string
    carbs?: string
    fats?: string
  }>({})

  const handleFoodSelect = (food: FoodItem) => {
    // Store selected food
    setSelectedFood(food)
    setFoodQuantity(1) // Reset quantity to 1
    
    // Update nutrition based on quantity (default 1)
    setManualNutrition({
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
    })
    
    // Populate meal name field (it's uncontrolled, so we can set value directly)
    if (formRef.current) {
      const nameInput = formRef.current.querySelector<HTMLInputElement>('input[name="name"]')
      if (nameInput) {
        nameInput.value = food.description
        // Trigger change event to ensure form submission picks it up
        nameInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
    
    setShowFoodSearch(false)
    // Clear meal selection when using food search
    setSelectedMeal(null)
    setCalculatedNutrition(null)
  }

  const handleMealSelect = (meal: MealLibraryItem, nutrition: { calories: number; protein: number; carbs: number; fats: number }) => {
    setSelectedMeal(meal)
    setCalculatedNutrition(nutrition)
    setManualNutrition({}) // Reset manual override
    
    // Populate form fields
    if (formRef.current) {
      const nameInput = formRef.current.querySelector<HTMLInputElement>('input[name="name"]')
      const mealTypeSelect = formRef.current.querySelector<HTMLSelectElement>('select[name="meal_type"]')
      const caloriesInput = formRef.current.querySelector<HTMLInputElement>('input[name="calories"]')
      const proteinInput = formRef.current.querySelector<HTMLInputElement>('input[name="protein"]')
      const carbsInput = formRef.current.querySelector<HTMLInputElement>('input[name="carbs"]')
      const fatsInput = formRef.current.querySelector<HTMLInputElement>('input[name="fats"]')
      
      if (nameInput) nameInput.value = meal.name
      if (mealTypeSelect) mealTypeSelect.value = meal.meal_type
      if (caloriesInput) caloriesInput.value = nutrition.calories.toString()
      if (proteinInput) proteinInput.value = nutrition.protein.toString()
      if (carbsInput) carbsInput.value = nutrition.carbs.toString()
      if (fatsInput) fatsInput.value = nutrition.fats.toString()
    }
  }

  // Auto-calculate nutrition when quantity or selected meal changes
  useEffect(() => {
    if (selectedMeal && typeof quantity === 'number' && quantity > 0) {
      const calculated = calculateMealNutrition(selectedMeal, quantity)
      setCalculatedNutrition(calculated)
      
      // Update form fields if not manually overridden
      if (formRef.current && Object.keys(manualNutrition).length === 0) {
        const caloriesInput = formRef.current.querySelector<HTMLInputElement>('input[name="calories"]')
        const proteinInput = formRef.current.querySelector<HTMLInputElement>('input[name="protein"]')
        const carbsInput = formRef.current.querySelector<HTMLInputElement>('input[name="carbs"]')
        const fatsInput = formRef.current.querySelector<HTMLInputElement>('input[name="fats"]')
        
        if (caloriesInput) caloriesInput.value = calculated.calories.toString()
        if (proteinInput) proteinInput.value = calculated.protein.toString()
        if (carbsInput) carbsInput.value = calculated.carbs.toString()
        if (fatsInput) fatsInput.value = calculated.fats.toString()
      }
    }
  }, [quantity, selectedMeal, manualNutrition])

  // Auto-calculate nutrition when food quantity changes
  useEffect(() => {
    if (selectedFood && typeof foodQuantity === 'number' && foodQuantity > 0) {
      const calculated = {
        calories: Math.round(selectedFood.calories * foodQuantity),
        protein: Math.round(selectedFood.protein * foodQuantity * 10) / 10,
        carbs: Math.round(selectedFood.carbs * foodQuantity * 10) / 10,
        fats: Math.round(selectedFood.fats * foodQuantity * 10) / 10,
      }
      
      // Update manual nutrition state (this will update the form fields automatically)
      setManualNutrition(calculated)
      
      // Also update form fields directly for immediate visual feedback
      if (formRef.current) {
        const caloriesInput = formRef.current.querySelector<HTMLInputElement>('input[name="calories"]')
        const proteinInput = formRef.current.querySelector<HTMLInputElement>('input[name="protein"]')
        const carbsInput = formRef.current.querySelector<HTMLInputElement>('input[name="carbs"]')
        const fatsInput = formRef.current.querySelector<HTMLInputElement>('input[name="fats"]')
        
        if (caloriesInput) caloriesInput.value = calculated.calories.toString()
        if (proteinInput) proteinInput.value = calculated.protein.toString()
        if (carbsInput) carbsInput.value = calculated.carbs.toString()
        if (fatsInput) fatsInput.value = calculated.fats.toString()
      }
    }
  }, [foodQuantity, selectedFood])

  // Get current meal type from form
  const currentMealType = formRef.current?.querySelector<HTMLSelectElement>('select[name="meal_type"]')?.value as MealType | undefined

  return (
    <>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4 md:space-y-6" id="meal-form">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-xs md:text-sm text-dim font-mono">Enter manually, search food database, or browse meal library</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMealSelector(true)}
                className="btn-secondary gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Browse Meals</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFoodSearch(true)}
                className="btn-secondary gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
              >
                <span>Search Food</span>
              </button>
            </div>
          </div>

          {/* Quantity Input (shown when meal is selected) */}
          {selectedMeal && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-accent" />
                  <span className="text-xs font-mono text-text font-semibold">{selectedMeal.name}</span>
                  <span className="text-[10px] text-dim font-mono px-1.5 py-0.5 bg-border rounded">
                    {selectedMeal.cuisine}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMeal(null)
                    setCalculatedNutrition(null)
                    setManualNutrition({})
                    setQuantity(1)
                  }}
                  className="text-dim hover:text-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim">
                  Quantity:
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={quantity}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      setQuantity('')
                    } else {
                      const numValue = Number(value)
                      if (!isNaN(numValue) && numValue > 0) {
                        setQuantity(numValue)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const numValue = Number(e.target.value)
                    if (isNaN(numValue) || numValue <= 0) {
                      setQuantity(1)
                    } else {
                      setQuantity(numValue)
                    }
                  }}
                  className="input-modern w-20 text-sm"
                />
                <span className="text-[10px] text-dim font-mono">
                  x {selectedMeal.serving_size}
                </span>
                {calculatedNutrition && Object.keys(manualNutrition).length === 0 && (
                  <span className="text-[10px] text-accent font-mono ml-auto">
                    (auto-calculated)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Selected USDA Food Card */}
          {selectedFood && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-accent" />
                  <span className="text-xs font-mono text-text font-semibold">{selectedFood.description}</span>
                  {selectedFood.brandName && (
                    <span className="text-[10px] text-dim font-mono px-1.5 py-0.5 bg-border rounded">
                      {selectedFood.brandName}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFood(null)
                    setFoodQuantity(1)
                    setManualNutrition({})
                    if (formRef.current) {
                      const nameInput = formRef.current.querySelector<HTMLInputElement>('input[name="name"]')
                      const caloriesInput = formRef.current.querySelector<HTMLInputElement>('input[name="calories"]')
                      const proteinInput = formRef.current.querySelector<HTMLInputElement>('input[name="protein"]')
                      const carbsInput = formRef.current.querySelector<HTMLInputElement>('input[name="carbs"]')
                      const fatsInput = formRef.current.querySelector<HTMLInputElement>('input[name="fats"]')
                      if (nameInput) nameInput.value = ''
                      if (caloriesInput) caloriesInput.value = ''
                      if (proteinInput) proteinInput.value = ''
                      if (carbsInput) carbsInput.value = ''
                      if (fatsInput) fatsInput.value = ''
                    }
                  }}
                  className="text-dim hover:text-text"
                  aria-label="Remove food"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim">
                  Quantity:
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={foodQuantity}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      setFoodQuantity('')
                    } else {
                      const numValue = Number(value)
                      if (!isNaN(numValue) && numValue > 0) {
                        setFoodQuantity(numValue)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const numValue = Number(e.target.value)
                    if (isNaN(numValue) || numValue <= 0) {
                      setFoodQuantity(1)
                    } else {
                      setFoodQuantity(numValue)
                    }
                  }}
                  className="input-modern w-20 text-sm"
                />
                <span className="text-[10px] text-dim font-mono">
                  x {selectedFood.servingSize ? `${selectedFood.servingSize} ${selectedFood.servingSizeUnit || 'g'}` : 'serving'}
                </span>
                {Object.keys(manualNutrition).length > 0 && (
                  <span className="text-[10px] text-accent font-mono ml-auto">
                    (auto-calculated)
                  </span>
                )}
              </div>
            </div>
          )}

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
                value={manualNutrition.calories !== undefined ? manualNutrition.calories : (calculatedNutrition?.calories !== undefined ? calculatedNutrition.calories : (editingMeal?.calories || ''))}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setManualNutrition(prev => {
                      const { calories, ...rest } = prev
                      return rest
                    })
                  } else {
                    const numValue = Number(value)
                    if (!isNaN(numValue) && numValue >= 0) {
                      setManualNutrition(prev => ({ ...prev, calories: numValue }))
                    }
                  }
                }}
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
                value={manualNutrition.protein !== undefined ? manualNutrition.protein : (calculatedNutrition?.protein !== undefined ? calculatedNutrition.protein : (editingMeal?.protein || ''))}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setManualNutrition(prev => {
                      const { protein, ...rest } = prev
                      return rest
                    })
                  } else {
                    const numValue = Number(value)
                    if (!isNaN(numValue) && numValue >= 0) {
                      setManualNutrition(prev => ({ ...prev, protein: numValue }))
                    }
                  }
                }}
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
                value={manualNutrition.carbs !== undefined ? manualNutrition.carbs : (calculatedNutrition?.carbs !== undefined ? calculatedNutrition.carbs : (editingMeal?.carbs || ''))}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setManualNutrition(prev => {
                      const { carbs, ...rest } = prev
                      return rest
                    })
                  } else {
                    const numValue = Number(value)
                    if (!isNaN(numValue) && numValue >= 0) {
                      setManualNutrition(prev => ({ ...prev, carbs: numValue }))
                    }
                  }
                }}
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
                value={manualNutrition.fats !== undefined ? manualNutrition.fats : (calculatedNutrition?.fats !== undefined ? calculatedNutrition.fats : (editingMeal?.fats || ''))}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setManualNutrition(prev => {
                      const { fats, ...rest } = prev
                      return rest
                    })
                  } else {
                    const numValue = Number(value)
                    if (!isNaN(numValue) && numValue >= 0) {
                      setManualNutrition(prev => ({ ...prev, fats: numValue }))
                    }
                  }
                }}
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
      <FoodSearch
        open={showFoodSearch}
        onSelectFood={handleFoodSelect}
        onClose={() => setShowFoodSearch(false)}
      />

      {/* Meal Selector Dialog */}
      <MealSelector
        open={showMealSelector}
        onClose={() => setShowMealSelector(false)}
        onSelect={handleMealSelect}
        mealType={currentMealType}
        quantity={typeof quantity === 'number' ? quantity : Number(quantity) || 1}
      />
    </>
  )
}

