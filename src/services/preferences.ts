import { supabase } from '@/lib/supabase'
import { UserPreferences } from '@/types'
import { handleSupabaseError } from '@/lib/errors'

/**
 * Get user preferences from database
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'getUserPreferences')
      return null
    }

    return (data?.preferences as UserPreferences) || null
  } catch (error) {
    console.error('Error getting user preferences:', error)
    return null
  }
}

/**
 * Update user preferences in database
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    // Get current preferences
    const currentPrefs = await getUserPreferences(userId)
    const mergedPrefs: UserPreferences = {
      ...(currentPrefs || {}),
      ...preferences,
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences: mergedPrefs })
      .eq('id', userId)

    if (error) {
      handleSupabaseError(error, 'updateUserPreferences')
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return false
  }
}

/**
 * Migrate preferences from localStorage to database
 * Called on first login/load to migrate existing localStorage data
 */
export async function migratePreferencesFromLocalStorage(userId: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Check if preferences already exist in DB
    const dbPrefs = await getUserPreferences(userId)
    
    // Only migrate if DB preferences are empty/null
    if (dbPrefs && Object.keys(dbPrefs).length > 0) {
      return // Already migrated
    }

    const prefsToMigrate: Partial<UserPreferences> = {}

    // Migrate notification dialog dismissal
    const notificationDialogDismissed = localStorage.getItem('notification_dialog_dismissed')
    if (notificationDialogDismissed === 'true') {
      prefsToMigrate.notificationDialogDismissed = true
    }

    // Migrate theme preference
    const theme = localStorage.getItem('theme')
    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      prefsToMigrate.theme = theme as 'light' | 'dark' | 'system'
    }

    // Only update if we have something to migrate
    if (Object.keys(prefsToMigrate).length > 0) {
      await updateUserPreferences(userId, prefsToMigrate)
    }
  } catch (error) {
    console.error('Error migrating preferences from localStorage:', error)
    // Don't throw - migration failure shouldn't break the app
  }
}

