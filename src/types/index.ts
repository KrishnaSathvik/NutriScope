export type MealType = 'pre_breakfast' | 'breakfast' | 'morning_snack' | 'lunch' | 'evening_snack' | 'dinner' | 'post_dinner'

export interface Meal {
  id: string
  user_id: string
  date: string
  time?: string
  meal_type?: MealType
  name?: string
  calories: number
  protein: number
  carbs?: number
  fats?: number
  food_items?: FoodItem[]
  image_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface MealTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  meal_type: MealType
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
  image_url?: string
  created_at: string
  updated_at: string
}

export interface FoodItem {
  name: string
  calories: number
  protein: number
  carbs?: number
  fats?: number
  quantity?: string
}

export interface Exercise {
  id: string
  user_id: string
  date: string
  time?: string
  exercises: ExerciseDetail[]
  calories_burned: number
  duration?: number // in minutes
  notes?: string
  created_at: string
  updated_at: string
}

export interface ExerciseDetail {
  name: string
  type: 'cardio' | 'strength' | 'yoga' | 'sports' | 'other'
  duration?: number
  sets?: number
  reps?: number
  weight?: number
  calories_burned?: number
}

export interface WaterLog {
  id: string
  user_id: string
  date: string
  time?: string
  amount: number // in ml
  container_type?: string
  created_at: string
}

export interface DailyLog {
  date: string
  calories_consumed: number
  calories_burned: number
  net_calories: number
  protein: number
  carbs: number
  fats: number
  water_intake: number
  meals: Meal[]
  exercises: Exercise[]
  water_logs: WaterLog[]
}

export type UserGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_fitness'
export type DietaryPreference = 'vegetarian' | 'vegan' | 'non_vegetarian' | 'flexitarian'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export interface ReminderSettings {
  enabled: boolean
  meal_reminders: {
    enabled: boolean
    breakfast?: string // HH:mm format
    lunch?: string
    dinner?: string
    morning_snack?: string
    evening_snack?: string
  }
  water_reminders: {
    enabled: boolean
    interval_minutes?: number // e.g., 60 = every hour
    start_time?: string // HH:mm format
    end_time?: string // HH:mm format
  }
  workout_reminders: {
    enabled: boolean
    time?: string // HH:mm format
    days?: number[] // 0-6, Sunday-Saturday
  }
  goal_reminders: {
    enabled: boolean
    check_progress_time?: string // HH:mm format
  }
  weight_reminders: {
    enabled: boolean
    time?: string // HH:mm format
    days?: number[] // 0-6, Sunday-Saturday (e.g., [1, 3, 5] for Mon, Wed, Fri)
  }
  streak_reminders: {
    enabled: boolean
    time?: string // HH:mm format
    check_days?: number[] // Days to check streak (e.g., [1, 2, 3, 4, 5] for weekdays)
  }
  summary_reminders: {
    enabled: boolean
    time?: string // HH:mm format (e.g., "20:00" for 8 PM daily summary)
  }
}

export interface UserPreferences {
  notificationDialogDismissed?: boolean
  theme?: 'light' | 'dark' | 'system'
}

export interface UserProfile {
  id: string
  user_id?: string
  email?: string
  name?: string
  age?: number
  weight?: number
  height?: number
  gender?: 'male' | 'female'
  goal: UserGoal
  activity_level: ActivityLevel
  dietary_preference: DietaryPreference
  calorie_target?: number
  target_calories?: number
  protein_target?: number
  target_protein?: number
  water_goal?: number // in ml, default 2000
  restrictions?: string[]
  reminder_enabled?: boolean
  reminder_settings?: ReminderSettings
  preferences?: UserPreferences // Phase 1: User preferences
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  image_url?: string
  action?: AIAction // Action associated with this message
  requires_confirmation?: boolean // Whether this message requires user confirmation
  confirmed?: boolean // Whether user confirmed (for tracking)
}

export interface ChatConversation {
  id: string
  user_id: string
  title?: string
  messages: ChatMessage[]
  summary?: string // AI-generated summary of conversation for long histories
  created_at: string
  updated_at: string
}

// ============================================================================
// RECIPES
// ============================================================================

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string // 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', etc.
}

export interface RecipeNutrition {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  description?: string
  servings: number
  prep_time?: number // minutes
  cook_time?: number // minutes
  ingredients?: RecipeIngredient[] // Optional - kept for backward compatibility
  instructions: string // Text field - can be paragraphs or numbered steps
  nutrition_per_serving: RecipeNutrition
  image_url?: string
  tags: string[]
  is_favorite: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// MEAL PLANNING
// ============================================================================

export interface PlannedMeal {
  meal_type: MealType
  recipe_id?: string
  meal_data?: {
    name: string
    calories: number
    protein: number
    carbs?: number
    fats?: number
  }
}

export interface MealPlan {
  id: string
  user_id: string
  week_start_date: string // YYYY-MM-DD (Monday)
  planned_meals: {
    [day: string]: PlannedMeal[] // 'monday', 'tuesday', etc.
  }
  created_at: string
  updated_at: string
}

// ============================================================================
// GROCERY LISTS
// ============================================================================

export interface GroceryItem {
  name: string
  quantity: number
  unit: string
  checked: boolean
  category?: string // 'produce', 'meat', 'dairy', 'pantry', etc.
}

export interface GroceryList {
  id: string
  user_id: string
  name: string
  items: GroceryItem[]
  week_start_date?: string
  created_at: string
  updated_at: string
}

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export type AchievementType = 'streak' | 'goal' | 'milestone' | 'special'

export interface Achievement {
  id: string
  user_id: string
  achievement_type: AchievementType
  achievement_key: string // Unique identifier
  title: string
  description?: string
  icon?: string
  unlocked_at: string
  progress: number // 0-100
  metadata?: Record<string, any>
}

export interface AchievementDefinition {
  key: string
  type: AchievementType
  title: string
  description: string
  icon: string
  condition: (userData: any) => boolean | Promise<boolean>
  progress?: (userData: any) => number // 0-100
}

export interface AIAction {
  type: 'log_meal' | 'log_meal_with_confirmation' | 'log_workout' | 'log_water' | 
        'get_summary' | 'generate_recipe' | 'save_recipe' | 'add_to_meal_plan' | 
        'add_to_grocery_list' | 'answer_food_question' | 'none'
  data?: {
    // Meal logging
    meal_type?: MealType
    calories?: number
    protein?: number
    carbs?: number
    fats?: number
    food_items?: FoodItem[]
    meal_description?: string
    
    // Workout
    exercise_name?: string
    exercise_type?: string
    duration?: number
    calories_burned?: number
    
    // Water
    water_amount?: number
    
    // Recipe
    recipe?: Recipe
    recipe_name?: string
    recipe_description?: string
    
    // Meal Plan
    day?: string // 'monday', 'tuesday', etc.
    meal_plan_meal?: PlannedMeal
    
    // Grocery List
    grocery_items?: string[]
    grocery_list_name?: string
    
    // Food Question
    question?: string
    answer?: string
    can_eat?: boolean
    reasoning?: string
  }
  requires_confirmation?: boolean
  confirmation_message?: string
}

export type ReminderType = 'meal' | 'water' | 'workout' | 'goal'

export interface Notification {
  id: string
  type: ReminderType
  title: string
  message: string
  timestamp: string
  read: boolean
  action_url?: string
}
