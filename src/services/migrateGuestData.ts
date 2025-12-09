import { supabase } from '@/lib/supabase'

interface MigrationProgress {
  step: string
  progress: number
  total: number
}

export async function migrateGuestDataToNewUser(
  guestUserId: string,
  newUserId: string,
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ success: boolean; errors: string[] }> {
  if (!supabase) {
    return { success: false, errors: ['Supabase client not available'] }
  }

  const errors: string[] = []

  // 1. Migrate User Profile
  try {
    onProgress?.({ step: 'Migrating profile...', progress: 1, total: 11 })
    const { data: guestProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', guestUserId)
      .single()

    if (guestProfile) {
      // Get new user's email from auth.users
      const { data: { user: newUser } } = await supabase.auth.getUser()
      const newUserEmail = newUser?.email || null
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: newUserId,
          email: newUserEmail, // Use new user's email (from signup)
          name: guestProfile.name,
          age: guestProfile.age,
          weight: guestProfile.weight,
          height: guestProfile.height,
          goal: guestProfile.goal,
          activity_level: guestProfile.activity_level,
          dietary_preference: guestProfile.dietary_preference,
          target_calories: guestProfile.target_calories,
          target_protein: guestProfile.target_protein,
          target_carbs: guestProfile.target_carbs,
          target_fats: guestProfile.target_fats,
          water_goal: guestProfile.water_goal,
          reminder_enabled: guestProfile.reminder_enabled,
          reminder_settings: guestProfile.reminder_settings,
          created_at: guestProfile.created_at,
          updated_at: new Date().toISOString(),
        })

      if (error) errors.push(`Profile migration: ${error.message}`)
    }
  } catch (error: any) {
    errors.push(`Profile migration error: ${error.message}`)
  }

  // 2. Migrate Chat Conversations
  try {
    onProgress?.({ step: 'Migrating chat conversations...', progress: 2, total: 11 })
    const { data: conversations } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', guestUserId)

    if (conversations && conversations.length > 0) {
      const updates = conversations.map((conv) => ({
        ...conv,
        user_id: newUserId,
        id: undefined, // Let Supabase generate new ID
      }))

      for (const conv of updates) {
        const { id, ...convData } = conv
        const { error } = await supabase
          .from('chat_conversations')
          .insert(convData)
        if (error) errors.push(`Chat conversation migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Chat conversations migration error: ${error.message}`)
  }

  // 3. Migrate Meals
  try {
    onProgress?.({ step: 'Migrating meals...', progress: 3, total: 11 })
    const { data: meals } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', guestUserId)

    if (meals && meals.length > 0) {
      const updates = meals.map((meal) => ({
        ...meal,
        user_id: newUserId,
        id: undefined,
      }))

      for (const meal of updates) {
        const { id, ...mealData } = meal
        const { error } = await supabase
          .from('meals')
          .insert(mealData)
        if (error) errors.push(`Meal migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Meals migration error: ${error.message}`)
  }

  // 4. Migrate Exercises/Workouts
  try {
    onProgress?.({ step: 'Migrating workouts...', progress: 4, total: 11 })
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', guestUserId)

    if (exercises && exercises.length > 0) {
      const updates = exercises.map((exercise) => ({
        ...exercise,
        user_id: newUserId,
        id: undefined,
      }))

      for (const exercise of updates) {
        const { id, ...exerciseData } = exercise
        const { error } = await supabase
          .from('exercises')
          .insert(exerciseData)
        if (error) errors.push(`Exercise migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Exercises migration error: ${error.message}`)
  }

  // 5. Migrate Daily Logs
  try {
    onProgress?.({ step: 'Migrating daily logs...', progress: 5, total: 11 })
    const { data: dailyLogs } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', guestUserId)

    if (dailyLogs && dailyLogs.length > 0) {
      for (const log of dailyLogs) {
        const { error } = await supabase
          .from('daily_logs')
          .upsert({
            ...log,
            user_id: newUserId,
          }, {
            onConflict: 'user_id,date',
          })
        if (error) errors.push(`Daily log migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Daily logs migration error: ${error.message}`)
  }

  // 6. Migrate Meal Templates
  try {
    onProgress?.({ step: 'Migrating meal templates...', progress: 6, total: 11 })
    const { data: templates } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('user_id', guestUserId)

    if (templates && templates.length > 0) {
      const updates = templates.map((template) => ({
        ...template,
        user_id: newUserId,
        id: undefined,
      }))

      for (const template of updates) {
        const { id, ...templateData } = template
        const { error } = await supabase
          .from('meal_templates')
          .insert(templateData)
        if (error) errors.push(`Meal template migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Meal templates migration error: ${error.message}`)
  }

  // 7. Migrate Weight Logs
  try {
    onProgress?.({ step: 'Migrating weight logs...', progress: 7, total: 11 })
    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', guestUserId)

    if (weightLogs && weightLogs.length > 0) {
      const updates = weightLogs.map((log) => ({
        ...log,
        user_id: newUserId,
        id: undefined,
      }))

      for (const log of updates) {
        const { id, ...logData } = log
        const { error } = await supabase
          .from('weight_logs')
          .insert(logData)
        if (error) errors.push(`Weight log migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Weight logs migration error: ${error.message}`)
  }

  // 8. Migrate Recipes
  try {
    onProgress?.({ step: 'Migrating recipes...', progress: 8, total: 11 })
    const { data: recipes } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', guestUserId)

    if (recipes && recipes.length > 0) {
      const updates = recipes.map((recipe) => ({
        ...recipe,
        user_id: newUserId,
        id: undefined,
      }))

      for (const recipe of updates) {
        const { id, ...recipeData } = recipe
        const { error } = await supabase
          .from('recipes')
          .insert(recipeData)
        if (error) errors.push(`Recipe migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Recipes migration error: ${error.message}`)
  }

  // 9. Migrate Meal Plans
  try {
    onProgress?.({ step: 'Migrating meal plans...', progress: 9, total: 11 })
    const { data: mealPlans } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', guestUserId)

    if (mealPlans && mealPlans.length > 0) {
      const updates = mealPlans.map((plan) => ({
        ...plan,
        user_id: newUserId,
        id: undefined,
      }))

      for (const plan of updates) {
        const { id, ...planData } = plan
        const { error } = await supabase
          .from('meal_plans')
          .insert(planData)
        if (error) errors.push(`Meal plan migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Meal plans migration error: ${error.message}`)
  }

  // 10. Migrate Grocery Lists
  try {
    onProgress?.({ step: 'Migrating grocery lists...', progress: 10, total: 11 })
    const { data: groceryLists } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('user_id', guestUserId)

    if (groceryLists && groceryLists.length > 0) {
      const updates = groceryLists.map((list) => ({
        ...list,
        user_id: newUserId,
        id: undefined,
      }))

      for (const list of updates) {
        const { id, ...listData } = list
        const { error } = await supabase
          .from('grocery_lists')
          .insert(listData)
        if (error) errors.push(`Grocery list migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Grocery lists migration error: ${error.message}`)
  }

  // 11. Migrate Achievements
  try {
    onProgress?.({ step: 'Migrating achievements...', progress: 11, total: 11 })
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', guestUserId)

    if (achievements && achievements.length > 0) {
      const updates = achievements.map((achievement) => ({
        ...achievement,
        user_id: newUserId,
        id: undefined,
      }))

      for (const achievement of updates) {
        const { id, ...achievementData } = achievement
        const { error } = await supabase
          .from('achievements')
          .insert(achievementData)
        if (error) errors.push(`Achievement migration: ${error.message}`)
      }
    }
  } catch (error: any) {
    errors.push(`Achievements migration error: ${error.message}`)
  }

  return {
    success: errors.length === 0,
    errors,
  }
}

