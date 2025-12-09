/**
 * Validation utilities for form inputs
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' }
  }
  
  return { isValid: true }
}

/**
 * Validate number input
 */
export function validateNumber(
  value: number | string,
  options: {
    min?: number
    max?: number
    required?: boolean
    label?: string
  } = {}
): ValidationResult {
  const { min, max, required = false, label = 'Value' } = options
  
  if (required && (value === '' || value === null || value === undefined)) {
    return { isValid: false, error: `${label} is required` }
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${label} must be a number` }
  }
  
  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `${label} must be at least ${min}` }
  }
  
  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `${label} must be at most ${max}` }
  }
  
  return { isValid: true }
}

/**
 * Validate required field
 */
export function validateRequired(value: any, label: string = 'Field'): ValidationResult {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
    return { isValid: false, error: `${label} is required` }
  }
  
  return { isValid: true }
}

/**
 * Validate meal nutrition values
 */
export function validateMealNutrition(data: {
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
}): ValidationResult {
  if (data.calories !== undefined) {
    const caloriesCheck = validateNumber(data.calories, { min: 0, max: 10000, label: 'Calories' })
    if (!caloriesCheck.isValid) return caloriesCheck
  }
  
  if (data.protein !== undefined) {
    const proteinCheck = validateNumber(data.protein, { min: 0, max: 1000, label: 'Protein' })
    if (!proteinCheck.isValid) return proteinCheck
  }
  
  if (data.carbs !== undefined) {
    const carbsCheck = validateNumber(data.carbs, { min: 0, max: 1000, label: 'Carbs' })
    if (!carbsCheck.isValid) return carbsCheck
  }
  
  if (data.fats !== undefined) {
    const fatsCheck = validateNumber(data.fats, { min: 0, max: 1000, label: 'Fats' })
    if (!fatsCheck.isValid) return fatsCheck
  }
  
  return { isValid: true }
}

/**
 * Validate workout duration
 */
export function validateWorkoutDuration(duration: number | string): ValidationResult {
  return validateNumber(duration, { min: 1, max: 1440, label: 'Duration' })
}

/**
 * Validate weight
 */
export function validateWeight(weight: number | string): ValidationResult {
  return validateNumber(weight, { min: 20, max: 500, label: 'Weight' })
}

/**
 * Validate height
 */
export function validateHeight(height: number | string): ValidationResult {
  return validateNumber(height, { min: 50, max: 300, label: 'Height' })
}

/**
 * Validate age
 */
export function validateAge(age: number | string): ValidationResult {
  return validateNumber(age, { min: 1, max: 150, label: 'Age' })
}

