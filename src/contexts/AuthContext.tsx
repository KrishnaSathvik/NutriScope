import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { UserProfile } from '@/types'
import { migrateGuestDataToNewUser } from '@/services/migrateGuestData'
import { getUserPreferences, updateUserPreferences, migratePreferencesFromLocalStorage } from '@/services/preferences'
import { logger } from '@/utils/logger'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isGuest: boolean
  loading: boolean
  showOnboarding: boolean
  showNotificationDialog: boolean
  showGuestRestoreDialog: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
  migrateGuestData: (newUserId: string) => Promise<{ success: boolean; errors: string[] }>
  migrateOldGuestData: (oldGuestUserId: string, newGuestUserId: string) => Promise<{ success: boolean; errors: string[] }>
  completeOnboarding: () => void
  dismissNotificationDialog: () => void
  dismissGuestRestoreDialog: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [showGuestRestoreDialog, setShowGuestRestoreDialog] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Check for existing session
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // Check if user is anonymous (guest)
        const isAnonymous = session.user.is_anonymous || !session.user.email
        setIsGuest(isAnonymous)
        loadProfile(session.user.id)
      } else {
        setIsGuest(false)
        setLoading(false)
      }
    }).catch(() => {
      setLoading(false)
    })

    // Listen for auth changes
    if (!supabase) {
      setLoading(false)
      return
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // Check if user is anonymous (guest)
        const isAnonymous = session.user.is_anonymous || !session.user.email
        setIsGuest(isAnonymous)
        
        // Check if we need to show guest restore dialog
        if (isAnonymous && typeof window !== 'undefined') {
          const shouldShowRestore = localStorage.getItem('nutriscope_restore_guest_data') === 'true'
          if (shouldShowRestore) {
            setShowGuestRestoreDialog(true)
          }
        }
        
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setIsGuest(false)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      if (!supabase) {
        setShowOnboarding(true)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        // Handle 406 and other errors gracefully
        if (error.code === 'PGRST116' || error.code === '406' || error.message?.includes('406')) {
          // No profile found or content negotiation issue - show onboarding
          setShowOnboarding(true)
        } else {
          logger.error('Error loading profile:', error)
          setShowOnboarding(true)
        }
      } else if (data) {
        setProfile(data as UserProfile)
        setShowOnboarding(false)
        
        // Phase 1: Migrate preferences from localStorage to DB (one-time migration)
        migratePreferencesFromLocalStorage(userId).catch(err => {
          logger.warn('Failed to migrate preferences:', err)
        })
        
        // Check notification dialog dismissal from DB preferences
        const prefs = await getUserPreferences(userId)
        if (prefs?.notificationDialogDismissed) {
          // Already dismissed in DB, don't show
        } else if (typeof window !== 'undefined' && 'Notification' in window) {
          // Check localStorage as fallback (for backward compatibility during migration)
          const localStorageDismissed = localStorage.getItem('notification_dialog_dismissed')
          if (!localStorageDismissed) {
            // Show notification dialog after a delay
            setTimeout(() => {
              setShowNotificationDialog(true)
            }, 500)
          }
        }
      } else {
        // No profile found, show onboarding
        setShowOnboarding(true)
      }
      } catch (error) {
        logger.error('Error loading profile:', error)
        setShowOnboarding(true)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please set up your environment variables.')
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    if (data.user) {
      await loadProfile(data.user.id)
    }
  }

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please set up your environment variables.')
    }

    // Check if current user is a guest (anonymous)
    const currentUser = user
    const isCurrentGuest = currentUser && (currentUser.is_anonymous || !currentUser.email)
    // Also check localStorage for stored guest user ID (from previous session)
    const storedGuestUserId = typeof window !== 'undefined' ? localStorage.getItem('nutriscope_guest_user_id') : null
    const guestUserId = isCurrentGuest ? currentUser.id : (storedGuestUserId || null)

    // Get the current origin for redirect URL
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth?verified=true`
      : undefined

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })
    if (error) throw error

    if (data.user) {
      // If migrating from guest, migrate all data (including profile)
      if (guestUserId && (isCurrentGuest || storedGuestUserId)) {
        // Clear stored guest user ID after migration
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nutriscope_guest_user_id')
          localStorage.removeItem('nutriscope_has_guest_data')
        }
        try {
          const result = await migrateGuestDataToNewUser(guestUserId, data.user.id)
          if (!result.success) {
            logger.warn('Some data migration errors:', result.errors)
          }
          // Migration creates/updates profile, so check if it exists before creating new one
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle()
          
          // Only create profile if migration didn't create one
          if (!existingProfile) {
            const { error: profileError } = await supabase.from('user_profiles').insert({
              id: data.user.id,
              email,
              goal: 'maintain',
              activity_level: 'moderate',
              dietary_preference: 'flexitarian',
              water_goal: 2000,
            })
            if (profileError) logger.error('Error creating profile:', profileError)
          }
        } catch (migrationError) {
          logger.error('Error migrating guest data:', migrationError)
          // If migration fails, still create basic profile
          const { error: profileError } = await supabase.from('user_profiles').insert({
            id: data.user.id,
            email,
            goal: 'maintain',
            activity_level: 'moderate',
            dietary_preference: 'flexitarian',
            water_goal: 2000,
          })
          if (profileError) console.error('Error creating profile:', profileError)
        }
      } else {
        // Not migrating - create new profile
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: data.user.id,
          email,
          goal: 'maintain',
          activity_level: 'moderate',
          dietary_preference: 'flexitarian',
          water_goal: 2000,
        })
        if (profileError) console.error('Error creating profile:', profileError)
      }
    }
  }

  const signInAnonymously = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please set up your environment variables.')
    }

    // Check if already signed in
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser && !currentUser.is_anonymous) {
      // Already signed in as regular user
      return
    }

    // Check if there's a stored old guest user ID (from previous session)
    const oldGuestUserId = typeof window !== 'undefined' ? localStorage.getItem('nutriscope_guest_user_id') : null
    const hasOldGuestData = typeof window !== 'undefined' ? localStorage.getItem('nutriscope_has_guest_data') === 'true' : false

    // Sign in anonymously (creates new anonymous user)
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error

    if (data.user) {
      // If there's old guest data and it's a different user ID, we need to migrate
      if (oldGuestUserId && oldGuestUserId !== data.user.id && hasOldGuestData) {
        // Store flag to show restore dialog
        if (typeof window !== 'undefined') {
          localStorage.setItem('nutriscope_restore_guest_data', 'true')
          localStorage.setItem('nutriscope_old_guest_user_id', oldGuestUserId)
        }
      }

      // Store new guest user ID
      if (typeof window !== 'undefined') {
        localStorage.setItem('nutriscope_guest_user_id', data.user.id)
        localStorage.setItem('nutriscope_has_guest_data', 'true')
      }
      // Check if profile exists, if not show onboarding
      await loadProfile(data.user.id)
    }
  }

  const signOut = async () => {
    // Keep guest user ID in localStorage even after sign out for detection
    // Only clear it if user explicitly wants to start fresh
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
    setProfile(null)
    setIsGuest(false)
  }

  const completeOnboarding = async () => {
    setShowOnboarding(false)
    // Reload profile if authenticated
    // Add a small delay to ensure database replication before reloading
    if (user) {
      // Wait a bit for database to sync
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadProfile(user.id)
    }
    // Show notification dialog after onboarding (if not already dismissed)
    // Check will happen in loadProfile after preferences are loaded
  }

  const dismissNotificationDialog = async () => {
    setShowNotificationDialog(false)
    
    // Phase 1: Save to DB instead of localStorage
    if (user?.id) {
      await updateUserPreferences(user.id, { notificationDialogDismissed: true })
    }
    
    // Keep localStorage as fallback for backward compatibility
    if (typeof window !== 'undefined') {
    localStorage.setItem('notification_dialog_dismissed', 'true')
    }
  }

  const migrateGuestData = async (newUserId: string): Promise<{ success: boolean; errors: string[] }> => {
    if (!user || !user.is_anonymous) {
      return { success: false, errors: ['No guest user to migrate'] }
    }

    return await migrateGuestDataToNewUser(user.id, newUserId)
  }

  const migrateOldGuestData = async (oldGuestUserId: string, newGuestUserId: string): Promise<{ success: boolean; errors: string[] }> => {
    // This migrates data from an old guest user to a new guest user
    // Note: This requires the old guest user's data to be accessible
    // Due to RLS, we can only do this if we have admin access or if the data is public
    // For now, we'll attempt it - it may fail due to RLS, but we'll try
    return await migrateGuestDataToNewUser(oldGuestUserId, newGuestUserId)
  }

  const dismissGuestRestoreDialog = () => {
    setShowGuestRestoreDialog(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nutriscope_restore_guest_data')
      localStorage.removeItem('nutriscope_old_guest_user_id')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isGuest,
        loading,
        showOnboarding,
        showNotificationDialog,
        showGuestRestoreDialog,
        signIn,
        signUp,
        signInAnonymously,
        signOut,
        migrateGuestData,
        migrateOldGuestData,
        completeOnboarding,
        dismissNotificationDialog,
        dismissGuestRestoreDialog,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

