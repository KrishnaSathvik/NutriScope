import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { UserProfile, UserGoal, UserGoalType, UserGoals, ActivityLevel, DietaryPreference } from '@/types'
import { ReminderSettingsSection } from '@/components/ReminderSettings'
import { getLatestWeight } from '@/services/weightTracking'
import AchievementWidget from '@/components/AchievementWidget'
import { GenderSelectionDialog } from '@/components/GenderSelectionDialog'
import { UpdateTargetsDialog } from '@/components/UpdateTargetsDialog'
import { calculatePersonalizedTargets } from '@/services/personalizedTargets'
import { Edit, X, User, Target, Activity, UtensilsCrossed, Flame, Droplet, Mail, CheckCircle2, Scale, UserCircle, Calendar, Weight, Beef, TrendingDown, TrendingUp, Dumbbell, Heart, Zap as EnergyIcon } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Set up realtime subscription for user profile
  // Note: user_profiles uses 'id' as primary key (not user_id), so we need a custom subscription
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured() || !user?.id) return
    
    const channel = supabase
      .channel(`user_profiles_${user.id}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`, // Filter by id (primary key), not user_id
        },
        () => {
          // Invalidate profile query to trigger refetch and update UI immediately
          queryClient.invalidateQueries({ queryKey: ['profile'] })
          // Also invalidate dailyLog so Dashboard recalculates TDEE/deficit
          queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
        }
      )
      .subscribe()
    
    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.id, queryClient])
  
  useUserRealtimeSubscription('weight_logs', ['latestWeight'], user?.id)
  
  // Weight tracking - for displaying in Personal Information section
  const { data: latestWeight } = useQuery({
    queryKey: ['latestWeight'],
    queryFn: getLatestWeight,
  })
  
  // Dialog states
  const [showGenderDialog, setShowGenderDialog] = useState(false)
  const [showUpdateTargetsDialog, setShowUpdateTargetsDialog] = useState(false)
  const [showGoalsChangeDialog, setShowGoalsChangeDialog] = useState(false)
  const [newTargets, setNewTargets] = useState<{
    calories: number
    protein: number
    water: number
  } | null>(null)
  const [pendingGoalsChange, setPendingGoalsChange] = useState<{
    newGoals: UserGoals
    newTargets: { calories: number; protein: number; water: number }
    currentTargets: { calories: number; protein: number; water: number }
  } | null>(null)
  const [previousGoals, setPreviousGoals] = useState<UserGoals>([])
  const [previousActivityLevel, setPreviousActivityLevel] = useState<ActivityLevel | null>(null)
  
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<{
    name: string
    age?: number
    height?: number
    weight?: number
    goal: UserGoal
    goals?: UserGoals // Array of goals for multi-selection
    activity_level: ActivityLevel
    dietary_preference: DietaryPreference
    calorie_target?: number
    protein_target?: number
    water_goal?: number
    target_weight?: number // Target weight in kg
    timeframe_months?: number // Timeframe in months
  }>({
    name: profile?.name || '',
    age: profile?.age || undefined,
    height: profile?.height || undefined,
    weight: profile?.weight || latestWeight?.weight || undefined,
    goal: profile?.goal || 'maintain',
    goals: (profile as any)?.goals && (profile as any).goals.length > 0 
      ? (profile as any).goals as UserGoals 
      : (profile?.goal ? [profile.goal] : ['maintain']) as UserGoals,
    activity_level: profile?.activity_level || 'moderate',
    dietary_preference: profile?.dietary_preference || 'flexitarian',
    calorie_target: profile?.calorie_target || profile?.target_calories || 2000,
    protein_target: profile?.protein_target || profile?.target_protein || 150,
    water_goal: profile?.water_goal || 2000,
    target_weight: (profile as any)?.target_weight || undefined,
    timeframe_months: (profile as any)?.timeframe_months || undefined,
  })

  // Check if user needs to add gender (one-time, only if profile exists but gender is missing)
  useEffect(() => {
    if (profile && !profile.gender && user && !showGenderDialog && !showUpdateTargetsDialog) {
      // Check if user previously dismissed the dialog
      const dismissedKey = `gender_dialog_dismissed_${user.id}`
      const wasDismissed = localStorage.getItem(dismissedKey)
      
      if (!wasDismissed) {
        // Small delay to avoid showing immediately on page load
        const timer = setTimeout(() => {
          setShowGenderDialog(true)
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [profile, user, showGenderDialog, showUpdateTargetsDialog])

  // Sync formData when profile or latestWeight changes (but only when not editing)
  useEffect(() => {
    if (!editing) {
      setFormData({
        name: profile?.name || '',
        age: profile?.age || undefined,
        height: profile?.height || undefined,
        weight: profile?.weight || latestWeight?.weight || undefined,
        goal: profile?.goal || 'maintain',
        goals: (profile as any)?.goals && (profile as any).goals.length > 0 
          ? (profile as any).goals as UserGoals 
          : (profile?.goal ? [profile.goal] : ['maintain']) as UserGoals,
        activity_level: profile?.activity_level || 'moderate',
        dietary_preference: profile?.dietary_preference || 'flexitarian',
        calorie_target: profile?.calorie_target || profile?.target_calories || 2000,
        protein_target: profile?.protein_target || profile?.target_protein || 150,
        water_goal: profile?.water_goal || 2000,
        target_weight: (profile as any)?.target_weight || undefined,
        timeframe_months: (profile as any)?.timeframe_months || undefined,
      })
    }
  }, [profile, latestWeight, editing])

  // Track previous goals and activity level when editing starts
  useEffect(() => {
    if (editing) {
      // Set previous values when editing starts (only once)
      if (previousGoals.length === 0 && formData.goals && formData.goals.length > 0) {
        setPreviousGoals([...formData.goals])
      }
      if (!previousActivityLevel && formData.activity_level) {
        setPreviousActivityLevel(formData.activity_level)
      }
    } else {
      // Reset when not editing
      setPreviousGoals([])
      setPreviousActivityLevel(null)
    }
  }, [editing])

  // Auto-calculate targets when weight, height, or age change (but not goals/activity - those show dialog on save)
  useEffect(() => {
    if (!editing) return // Only recalculate when editing
    
    const { weight, height, age, goals, activity_level, dietary_preference } = formData
    const profileGender = profile?.gender
    
    // Only recalculate if we have all required fields
    // Skip if goals or activity_level changed (will be handled on save)
    if (weight && height && age && goals && goals.length > 0 && activity_level && profileGender) {
      // Check if goals or activity level changed - if so, don't auto-update (will show dialog on save)
      const goalsChanged = previousGoals.length > 0 && 
        JSON.stringify([...previousGoals].sort()) !== JSON.stringify([...goals].sort())
      const activityChanged = previousActivityLevel && previousActivityLevel !== activity_level
      
      if (goalsChanged || activityChanged) {
        // Don't auto-update - will show dialog when user clicks Save Changes
        return
      }
      
      // Goals and activity didn't change, but other fields did - auto-update targets
      const isMale = profileGender === 'male'
      const targetWeight = (profile as any)?.target_weight
      const timeframeMonths = (profile as any)?.timeframe_months
      
      try {
        const targets = calculatePersonalizedTargets({
          weight,
          height,
          age,
          goal: goals,
          activityLevel: activity_level,
          dietaryPreference: dietary_preference,
          isMale,
          targetWeight: targetWeight,
          timeframeMonths: timeframeMonths,
        })
        
        // Update targets automatically
        setFormData(prev => ({
          ...prev,
          calorie_target: targets.calorie_target,
          protein_target: targets.protein_target,
          water_goal: targets.water_goal,
        }))
      } catch (error) {
        console.error('Error calculating targets:', error)
      }
    }
  }, [
    editing,
    formData.weight,
    formData.height,
    formData.age,
    formData.dietary_preference,
    profile?.gender,
    (profile as any)?.target_weight,
    (profile as any)?.timeframe_months,
    // Note: formData.goals, formData.activity_level, previousGoals, and previousActivityLevel are excluded
    // to prevent auto-update when these change (will show dialog on save instead)
  ])

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      if (!user) throw new Error('Not authenticated')
      if (!supabase) throw new Error('Supabase not configured')
      
      // Map form field names to database column names
      // The database uses: calorie_target, protein_target (not target_calories, target_protein)
      const fieldMapping: Record<string, string> = {
        target_calories: 'calorie_target',
        target_protein: 'protein_target',
      }
      
      // Filter out undefined, null, and empty string values
      // Also convert empty strings to null for number fields to allow clearing
      const cleanData: Record<string, any> = {}
      Object.entries(data).forEach(([key, value]) => {
        // Skip undefined and null
        if (value === undefined || value === null) return
        
        // Map field name to database column name if needed
        const dbColumnName = fieldMapping[key] || key
        
        // For number fields (age, weight, height, targets), allow empty string to clear
        const numberFields = ['age', 'weight', 'height', 'calorie_target', 'protein_target', 'water_goal', 'target_carbs', 'target_fats']
        if (numberFields.includes(dbColumnName)) {
          if (value === '' || value === null || value === undefined) {
            cleanData[dbColumnName] = null // Set to null to clear the field
          } else {
            cleanData[dbColumnName] = Number(value) // Ensure it's a number
          }
        } else if (value !== '') {
          // For other fields, skip empty strings
          cleanData[dbColumnName] = value
        }
      })
      
      // Don't send update if there's nothing to update
      if (Object.keys(cleanData).length === 0) {
        return
      }
      
      const { error, data: updateData } = await supabase
        .from('user_profiles')
        .update(cleanData)
        .eq('id', user.id)
        .select()
      
      if (error) {
        console.error('Profile update error:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        console.error('Data attempted:', cleanData)
        throw new Error(error.message || `Failed to update profile: ${error.code}`)
      }
      
      return updateData
    },
    onSuccess: () => {
      // Invalidate profile query to trigger refetch and update UI immediately
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Also invalidate dailyLog so Dashboard recalculates TDEE/deficit when targets change
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      setEditing(false)
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    },
    onError: (error: any) => {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    },
  })

  // Handle gender selection and recalculate targets
  const handleGenderSelected = async (gender: 'male' | 'female') => {
    if (!user || !supabase || !profile) return

    try {
      // Save gender to profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ gender })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Wait for profile to refresh to get updated data
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      // Small delay to ensure profile is refreshed
      await new Promise(resolve => setTimeout(resolve, 100))

      // Recalculate targets if we have required data
      // Use the current profile data (which should now include gender)
      const userGoals: UserGoals = (profile as any)?.goals && (profile as any).goals.length > 0
        ? (profile as any).goals as UserGoals
        : (profile?.goal ? [profile.goal] : ['maintain']) as UserGoals
      
      if (profile.weight && profile.height && profile.age && userGoals.length > 0 && profile.activity_level) {
        const isMale = gender === 'male'
        const targetWeight = (profile as any)?.target_weight
        const timeframeMonths = (profile as any)?.timeframe_months
        
        // Calculate NEW targets with the selected gender
        const newTargets = calculatePersonalizedTargets({
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          goal: userGoals, // Use goals array
          activityLevel: profile.activity_level,
          dietaryPreference: profile.dietary_preference,
          isMale, // Use the NEW gender value
          targetWeight: targetWeight, // Include target weight if available
          timeframeMonths: timeframeMonths, // Include timeframe if available
        })

        // Get CURRENT targets from profile (these were calculated with old/default gender)
        const currentCalories = profile.calorie_target || profile.target_calories || 2000
        const currentProtein = profile.protein_target || profile.target_protein || 150
        const currentWater = profile.water_goal || 2000

        // Only show dialog if there are actual changes
        const hasChanges = 
          Math.abs(newTargets.calorie_target - currentCalories) > 0 ||
          Math.abs(newTargets.protein_target - currentProtein) > 0 ||
          Math.abs(newTargets.water_goal - currentWater) > 0

        if (hasChanges) {
          setNewTargets({
            calories: newTargets.calorie_target,
            protein: newTargets.protein_target,
            water: newTargets.water_goal,
          })

          // Show update targets dialog
          setShowUpdateTargetsDialog(true)
        } else {
          // No changes, just show success message
          toast({
            title: "Gender saved",
            description: "Your targets are already optimized for your sex.",
          })
        }
      } else {
        toast({
          title: "Gender saved",
          description: "Your gender has been saved. Update your weight, height, and age to recalculate targets.",
        })
      }
    } catch (error) {
      console.error('Error saving gender:', error)
      throw error
    }
  }

  // Handle updating targets
  const handleUpdateTargets = async () => {
    if (!user || !supabase || !newTargets) return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          calorie_target: newTargets.calories,
          protein_target: newTargets.protein,
          water_goal: newTargets.water,
        })
        .eq('id', user.id)

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      setShowUpdateTargetsDialog(false)
      setNewTargets(null)

      toast({
        title: "Targets updated",
        description: "Your personalized targets have been updated based on your sex.",
      })
    } catch (error) {
      console.error('Error updating targets:', error)
      toast({
        title: "Error",
        description: "Failed to update targets. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle skipping target update
  const handleSkipTargetUpdate = () => {
    setShowUpdateTargetsDialog(false)
    setNewTargets(null)
  }

  // Handle confirming goal changes
  const handleConfirmGoalsChange = async () => {
    if (!pendingGoalsChange) return
    
    // Update formData with new targets
    setFormData(prev => ({
      ...prev,
      calorie_target: pendingGoalsChange.newTargets.calories,
      protein_target: pendingGoalsChange.newTargets.protein,
      water_goal: pendingGoalsChange.newTargets.water,
    }))
    
    // Update previous goals and activity level
    setPreviousGoals([...pendingGoalsChange.newGoals])
    setPreviousActivityLevel(formData.activity_level)
    
    // Close dialog
    setShowGoalsChangeDialog(false)
    setPendingGoalsChange(null)
    
    // Now save the changes
    await saveProfileChanges()
  }

  // Handle canceling goal changes
  const handleCancelGoalsChange = () => {
    if (!pendingGoalsChange) return
    
    // Revert goals and activity level to previous state
    setFormData(prev => ({
      ...prev,
      goals: previousGoals,
      goal: previousGoals.length > 0 ? (previousGoals[0] as UserGoal) : 'maintain',
      activity_level: previousActivityLevel || prev.activity_level,
    }))
    
    // Close dialog
    setShowGoalsChangeDialog(false)
    setPendingGoalsChange(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if goals or activity level changed
    const goalsChanged = previousGoals.length > 0 && 
      JSON.stringify([...previousGoals].sort()) !== JSON.stringify([...(formData.goals || [])].sort())
    const activityChanged = previousActivityLevel && previousActivityLevel !== formData.activity_level
    
    // If goals or activity level changed, show confirmation dialog
    if ((goalsChanged || activityChanged) && profile?.gender && formData.weight && formData.height && formData.age) {
      const isMale = profile.gender === 'male'
      const targetWeight = (profile as any)?.target_weight
      const timeframeMonths = (profile as any)?.timeframe_months
      
      try {
        const newTargets = calculatePersonalizedTargets({
          weight: formData.weight,
          height: formData.height,
          age: formData.age,
          goal: formData.goals || [],
          activityLevel: formData.activity_level,
          dietaryPreference: formData.dietary_preference,
          isMale,
          targetWeight: targetWeight,
          timeframeMonths: timeframeMonths,
        })
        
        const currentTargets = {
          calories: profile?.calorie_target || profile?.target_calories || 2000,
          protein: profile?.protein_target || profile?.target_protein || 150,
          water: profile?.water_goal || 2000,
        }
        
        // Show confirmation dialog
        setPendingGoalsChange({
          newGoals: formData.goals || [],
          newTargets: {
            calories: newTargets.calorie_target,
            protein: newTargets.protein_target,
            water: newTargets.water_goal,
          },
          currentTargets,
        })
        setShowGoalsChangeDialog(true)
        return // Don't save yet - wait for user confirmation
      } catch (error) {
        console.error('Error calculating targets:', error)
        // Fall through to save without dialog if calculation fails
      }
    }
    
    // No changes to goals/activity, or calculation failed - save directly
    await saveProfileChanges()
  }

  // Separate function to actually save the changes
  const saveProfileChanges = async () => {
    // Map formData to match database schema
    // Note: gender is NOT included here - it cannot be changed after onboarding
    // Only use calorie_target and protein_target (not target_calories/target_protein)
    const updateData: Partial<UserProfile> = {
      name: formData.name || undefined,
      age: formData.age || undefined,
      height: formData.height || undefined,
      weight: formData.weight || undefined,
      goal: formData.goal, // Single goal for backward compatibility
      goals: formData.goals && formData.goals.length > 0 ? formData.goals : undefined, // Array of goals (new)
      activity_level: formData.activity_level,
      dietary_preference: formData.dietary_preference,
      calorie_target: formData.calorie_target ?? undefined,
      protein_target: formData.protein_target ?? undefined,
      water_goal: formData.water_goal ?? undefined,
      target_weight: formData.target_weight ?? undefined,
      timeframe_months: formData.timeframe_months ?? undefined,
    }
    updateMutation.mutate(updateData)
  }

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      <div className="border-b border-border pb-4 md:pb-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="h-px w-6 md:w-8 bg-acid"></div>
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">User Settings</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">Profile</h1>
        </div>
      </div>

      <div className="card-modern border-acid/30 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-blue-500/20 dark:bg-blue-500/20 flex items-center justify-center border border-blue-500/30 dark:border-blue-500/30 flex-shrink-0">
              <User className="w-4 h-4 md:w-5 md:h-5 text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500" />
            </div>
            <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Personal Information</h2>
          </div>
          {!editing && (
            <button
              onClick={() => {
                // Initialize formData with current profile data including goals when editing starts
                const initialGoals = (profile as any)?.goals && (profile as any).goals.length > 0 
                  ? (profile as any).goals as UserGoals 
                  : (profile?.goal ? [profile.goal] : ['maintain']) as UserGoals
                
                setFormData({
                  name: profile?.name || '',
                  age: profile?.age || undefined,
                  height: profile?.height || undefined,
                  weight: profile?.weight || latestWeight?.weight || undefined,
                  goal: profile?.goal || 'maintain',
                  goals: initialGoals,
                  activity_level: profile?.activity_level || 'moderate',
                  dietary_preference: profile?.dietary_preference || 'flexitarian',
                  calorie_target: profile?.calorie_target || profile?.target_calories || 2000,
                  protein_target: profile?.protein_target || profile?.target_protein || 150,
                  water_goal: profile?.water_goal || 2000,
                  target_weight: (profile as any)?.target_weight || undefined,
                  timeframe_months: (profile as any)?.timeframe_months || undefined,
                })
                
                // Set previous values for comparison
                setPreviousGoals([...initialGoals])
                setPreviousActivityLevel(profile?.activity_level || 'moderate')
                
                setEditing(true)
              }}
              className="btn-secondary gap-1.5 md:gap-2 text-[10px] md:text-xs"
            >
              <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-modern text-sm md:text-base"
                placeholder="Enter your name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Age (optional)</label>
                <input
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : undefined })}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 25"
                  min="13"
                  max="120"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Height (cm, optional)</label>
                <input
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value ? Number(e.target.value) : undefined })}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 175"
                  min="100"
                  max="250"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Weight (kg, optional)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : undefined })}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 70"
                  min="30"
                  max="300"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                Goals (Select one or more)
              </label>
              <p className="text-xs text-dim font-mono mb-3">
                Select multiple goals to get personalized targets based on your combined objectives.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                {[
                  { value: "lose_weight" as UserGoalType, label: "Lose Weight", icon: TrendingDown, color: "#10B981", bgColor: "rgba(16, 185, 129, 0.15)" },
                  { value: "gain_muscle" as UserGoalType, label: "Gain Muscle", icon: Dumbbell, color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.15)" },
                  { value: "gain_weight" as UserGoalType, label: "Gain Weight", icon: TrendingUp, color: "#F97316", bgColor: "rgba(249, 115, 22, 0.15)" },
                  { value: "maintain" as UserGoalType, label: "Maintain", icon: Heart, color: "#EC4899", bgColor: "rgba(236, 72, 153, 0.15)" },
                  { value: "improve_fitness" as UserGoalType, label: "Improve Fitness", icon: Activity, color: "#3B82F6", bgColor: "rgba(59, 130, 246, 0.15)" },
                  { value: "build_endurance" as UserGoalType, label: "Build Endurance", icon: Activity, color: "#06B6D4", bgColor: "rgba(6, 182, 212, 0.15)" },
                  { value: "improve_health" as UserGoalType, label: "Improve Health", icon: Heart, color: "#8B5CF6", bgColor: "rgba(139, 92, 246, 0.15)" },
                  { value: "body_recomposition" as UserGoalType, label: "Body Recomp", icon: Target, color: "#6366F1", bgColor: "rgba(99, 102, 241, 0.15)" },
                  { value: "increase_energy" as UserGoalType, label: "Increase Energy", icon: EnergyIcon, color: "#FBBF24", bgColor: "rgba(251, 191, 36, 0.15)" },
                  { value: "reduce_body_fat" as UserGoalType, label: "Reduce Body Fat", icon: TrendingDown, color: "#14B8A6", bgColor: "rgba(20, 184, 166, 0.15)" },
                ].map((option) => {
                  const Icon = option.icon
                  const currentGoals = formData.goals || []
                  const isSelected = currentGoals.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const updatedGoals = isSelected
                          ? currentGoals.filter(g => g !== option.value)
                          : [...currentGoals, option.value]
                        setFormData({ 
                          ...formData, 
                          goals: updatedGoals as UserGoals,
                          goal: updatedGoals.length > 0 ? (updatedGoals[0] as UserGoal) : 'maintain' // Update single goal for backward compatibility
                        })
                      }}
                      className={`relative rounded-sm p-3 border-2 transition-all font-mono text-left text-xs ${
                        isSelected
                          ? "ring-2"
                          : "border-border bg-surface hover:border-dim"
                      }`}
                      style={isSelected ? { 
                        borderColor: option.color,
                        backgroundColor: option.bgColor,
                        boxShadow: `0 0 0 2px ${option.color}33`
                      } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex w-8 h-8 rounded-sm items-center justify-center flex-shrink-0" style={{ backgroundColor: isSelected ? option.bgColor : `${option.color}1A` }}>
                          <Icon className="w-4 h-4" style={{ color: option.color }} />
                        </div>
                        <span className="font-medium text-text">{option.label}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#0D9488' }}>
                          <CheckCircle2 className="w-3 h-3 text-white stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              {formData.goals && formData.goals.length > 0 && (
                <p className="text-xs text-accent font-mono mt-2">
                  {formData.goals.length} goal{formData.goals.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                Activity Level
                <span className="ml-2 text-[9px] normal-case font-normal">(affects calorie burn calculation)</span>
              </label>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value as any })}
                className="input-modern text-sm md:text-base"
              >
                <option value="sedentary">Sedentary (1.2x) - Little to no exercise</option>
                <option value="light">Light (1.375x) - Light exercise 1-3 days/week</option>
                <option value="moderate">Moderate (1.55x) - Moderate exercise 3-5 days/week</option>
                <option value="active">Active (1.725x) - Heavy exercise 6-7 days/week</option>
                <option value="very_active">Very Active (1.9x) - Very heavy exercise + physical job</option>
              </select>
              <p className="text-[10px] text-dim mt-1 font-mono">
                💡 Select based on your typical week. Changing this will recalculate your calorie targets.
              </p>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Dietary Preference</label>
              <select
                value={formData.dietary_preference}
                onChange={(e) => setFormData({ ...formData, dietary_preference: e.target.value as any })}
                className="input-modern text-sm md:text-base"
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="non_vegetarian">Non-Vegetarian</option>
                <option value="flexitarian">Flexitarian</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Calorie Target</label>
                <input
                  type="number"
                  value={formData.calorie_target || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : Number(e.target.value)
                    setFormData({ ...formData, calorie_target: value })
                  }}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 2000"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Protein Target (g)</label>
                <input
                  type="number"
                  value={formData.protein_target || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : Number(e.target.value)
                    setFormData({ ...formData, protein_target: value })
                  }}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 150"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Water Goal (ml)</label>
                <input
                  type="number"
                  value={formData.water_goal || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : Number(e.target.value)
                    setFormData({ ...formData, water_goal: value })
                  }}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 2000"
                />
              </div>
            </div>

            {/* Target Weight and Timeframe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Target Weight (kg, optional)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_weight || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : Number(e.target.value)
                    setFormData({ ...formData, target_weight: value })
                  }}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 70"
                  min="30"
                  max="300"
                />
                <p className="text-[9px] md:text-[10px] text-dim font-mono mt-1">Your ideal target weight</p>
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Timeframe (months, optional)</label>
                <input
                  type="number"
                  value={formData.timeframe_months || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : Number(e.target.value)
                    setFormData({ ...formData, timeframe_months: value })
                  }}
                  className="input-modern text-sm md:text-base"
                  placeholder="e.g., 6"
                  min="1"
                  max="24"
                />
                <p className="text-[9px] md:text-[10px] text-dim font-mono mt-1">Months to reach target weight (1-24)</p>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-border">
              <button
                type="submit"
                className="btn-secondary gap-2"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-text border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setFormData({
                    name: profile?.name || '',
                    age: profile?.age || undefined,
                    height: profile?.height || undefined,
                    weight: profile?.weight || latestWeight?.weight || undefined,
                    goal: profile?.goal || 'maintain',
                    goals: (profile as any)?.goals && (profile as any).goals.length > 0 
                      ? (profile as any).goals as UserGoals 
                      : (profile?.goal ? [profile.goal] : ['maintain']) as UserGoals,
                    activity_level: profile?.activity_level || 'moderate',
                    dietary_preference: profile?.dietary_preference || 'flexitarian',
                    calorie_target: profile?.calorie_target || profile?.target_calories || 2000,
                    protein_target: profile?.protein_target || profile?.target_protein || 150,
                    water_goal: profile?.water_goal || 2000,
                    target_weight: (profile as any)?.target_weight || undefined,
                    timeframe_months: (profile as any)?.timeframe_months || undefined,
                  })
                }}
                className="btn-secondary gap-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Basic Information - Name, Age, Height, Weight, Gender */}
            {(profile?.name || profile?.age || profile?.height || profile?.weight || latestWeight?.weight || profile?.gender) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {profile?.name && (
                  <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <UserCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Name</span>
                    </div>
                    <div className="font-bold text-text font-mono text-base md:text-lg">{profile.name}</div>
                  </div>
                )}
                {profile?.gender && (
                  <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <div className="w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center text-acid flex-shrink-0 font-bold text-lg md:text-xl">
                        {profile.gender === 'male' ? '♂' : '♀'}
                      </div>
                      <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Sex</span>
                    </div>
                    <div className="font-bold text-text font-mono text-base md:text-lg capitalize flex items-center gap-2">
                      <span>{profile.gender}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-success flex-shrink-0" />
                    </div>
                    <p className="text-[9px] md:text-[10px] text-dim font-mono mt-1">Gender cannot be changed</p>
                  </div>
                )}
                {profile?.age && (
                  <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Age</span>
                    </div>
                    <div className="font-bold text-text font-mono text-base md:text-lg">{profile.age} years</div>
                  </div>
                )}
                {profile?.height && (
                  <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <Scale className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Height</span>
                    </div>
                    <div className="font-bold text-text font-mono text-base md:text-lg">{profile.height} cm</div>
                  </div>
                )}
                {(profile?.weight || latestWeight?.weight) && (
                  <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <Weight className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Weight</span>
                    </div>
                    <div className="font-bold text-text font-mono text-base md:text-lg">
                      {latestWeight?.weight ? latestWeight.weight.toFixed(1) : profile?.weight?.toFixed(1)} kg
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email - Only show if user has email (not guest) */}
            {user?.email && (
              <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
                  <Mail className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider block mb-1">Email</span>
                  <div className="font-bold text-text font-mono text-sm md:text-base truncate flex items-center gap-2">
                    <span className="truncate">{profile?.email || user?.email}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-success flex-shrink-0" />
                  </div>
                  <p className="text-[9px] md:text-[10px] text-dim font-mono mt-1">Email cannot be changed</p>
                </div>
              </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                  <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Goals</span>
                </div>
                {(() => {
                  // Get goals array from profile (prefer goals array, fallback to single goal)
                  const userGoals: UserGoals = (profile as any)?.goals && (profile as any).goals.length > 0
                    ? (profile as any).goals as UserGoals
                    : (profile?.goal ? [profile.goal] : []) as UserGoals
                  
                  if (userGoals.length === 0) {
                    return <div className="font-bold text-text font-mono capitalize text-base md:text-lg">Not set</div>
                  }
                  
                  // Goal labels mapping
                  const goalLabels: Record<UserGoalType, string> = {
                    lose_weight: "Lose Weight",
                    gain_muscle: "Gain Muscle",
                    gain_weight: "Gain Weight",
                    maintain: "Maintain",
                    improve_fitness: "Improve Fitness",
                    build_endurance: "Build Endurance",
                    improve_health: "Improve Health",
                    body_recomposition: "Body Recomp",
                    increase_energy: "Increase Energy",
                    reduce_body_fat: "Reduce Body Fat",
                  }
                  
                  return (
                    <div className="space-y-2">
                      {userGoals.map((goal, index) => (
                        <div key={index} className="font-bold text-text font-mono capitalize text-sm md:text-base">
                          {goalLabels[goal as UserGoalType] || goal.replace('_', ' ')}
                        </div>
                      ))}
                      {userGoals.length > 1 && (
                        <p className="text-[9px] md:text-[10px] text-dim font-mono mt-1">
                          {userGoals.length} goals selected
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-success flex-shrink-0" />
                  <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Activity Level</span>
                </div>
                <div className="font-bold text-text font-mono capitalize text-base md:text-lg">{profile?.activity_level?.replace('_', ' ') || 'Not set'}</div>
              </div>
              <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <UtensilsCrossed className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                  <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Dietary Preference</span>
                </div>
                <div className="font-bold text-text font-mono capitalize text-base md:text-lg">{profile?.dietary_preference?.replace('_', ' ') || 'Not set'}</div>
              </div>
            </div>

            {/* Target Weight and Timeframe Display */}
            {((profile as any)?.target_weight || (profile as any)?.timeframe_months) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {(profile as any)?.target_weight && (
                  <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Target Weight</span>
                    </div>
                    <div className="font-bold text-text font-mono text-base md:text-lg">
                      {(profile as any).target_weight.toFixed(1)} kg
                    </div>
                    {profile?.weight && (
                      <p className="text-[9px] md:text-[10px] text-dim font-mono mt-1">
                        {((profile as any).target_weight - profile.weight) > 0 ? 'Gain' : 'Lose'} {Math.abs((profile as any).target_weight - profile.weight).toFixed(1)} kg
                      </p>
                    )}
                  </div>
                )}
                {(profile as any)?.timeframe_months && (
                  <div className="p-3 md:p-4 border border-border rounded-sm bg-panel/50">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Timeframe</span>
                    </div>
                    <div className="font-bold text-text font-mono text-base md:text-lg">
                      {(profile as any).timeframe_months} month{(profile as any).timeframe_months > 1 ? 's' : ''}
                    </div>
                    {(profile as any)?.target_weight && profile?.weight && (
                      <p className="text-[9px] md:text-[10px] text-dim font-mono mt-1">
                        {((Math.abs((profile as any).target_weight - profile.weight) / ((profile as any).timeframe_months * 4.33))).toFixed(2)} kg/week
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 md:pt-4 border-t border-border">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
                </div>
                <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Daily Targets</h3>
              </div>
              {/* Calculate TDEE and deficit if we have required data */}
              {(() => {
                // Use goals array if available, otherwise fall back to single goal
                const userGoals: UserGoals = (profile as any)?.goals && (profile as any).goals.length > 0
                  ? (profile as any).goals as UserGoals
                  : (profile?.goal ? [profile.goal] : ['maintain']) as UserGoals
                
                const hasRequiredData = profile?.weight && profile?.height && profile?.age && userGoals.length > 0 && profile?.activity_level && profile?.gender
                let tdee: number | null = null
                let deficit: number | null = null
                
                if (hasRequiredData) {
                  const targetWeight = (profile as any)?.target_weight
                  const timeframeMonths = (profile as any)?.timeframe_months
                  
                  const targets = calculatePersonalizedTargets({
                    weight: profile.weight!,
                    height: profile.height!,
                    age: profile.age!,
                    goal: userGoals, // Use goals array
                    activityLevel: profile.activity_level!,
                    dietaryPreference: profile.dietary_preference,
                    isMale: profile.gender === 'male',
                    targetWeight: targetWeight, // Include target weight if available
                    timeframeMonths: timeframeMonths, // Include timeframe if available
                  })
                  tdee = targets.tdee
                  
                  // Calculate deficit based on actual calorie_target vs TDEE
                  // If user manually changed calorie_target, use that instead of calculated target
                  const actualCalorieTarget = profile?.calorie_target || targets.calorie_target
                  deficit = actualCalorieTarget - tdee // Positive = deficit, Negative = surplus
                }
                
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
                      <div className="p-3 md:p-4 border border-orange-500/30 dark:border-acid/30 rounded-sm bg-orange-500/5 dark:bg-acid/5">
                        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                          <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500 flex-shrink-0" />
                          <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Calorie Target</span>
                        </div>
                        <div className="font-bold text-orange-500 dark:text-acid font-mono text-xl md:text-2xl">{profile?.calorie_target || 2000}</div>
                        <div className="text-[10px] md:text-xs text-dim font-mono mt-1">calories per day</div>
                      </div>
                      {tdee !== null && (
                        <div className="p-3 md:p-4 border border-purple-500/30 dark:border-purple-500/30 rounded-sm bg-purple-500/5 dark:bg-purple-500/5">
                          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500 flex-shrink-0" />
                            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Daily Burn (TDEE)</span>
                          </div>
                          <div className="font-bold text-purple-500 dark:text-purple-500 font-mono text-xl md:text-2xl">{tdee}</div>
                          <div className="text-[10px] md:text-xs text-dim font-mono mt-1">calories burned/day</div>
                        </div>
                      )}
                      {deficit !== null && (
                        <div className={`p-3 md:p-4 border rounded-sm ${
                          deficit < 0 
                            ? 'border-red-500/30 dark:border-red-500/30 bg-red-500/5 dark:bg-red-500/5' 
                            : deficit > 0
                            ? 'border-green-500/30 dark:border-green-500/30 bg-green-500/5 dark:bg-green-500/5'
                            : 'border-gray-500/30 dark:border-gray-500/30 bg-gray-500/5 dark:bg-gray-500/5'
                        }`}>
                          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                            {deficit < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500 fill-red-500 dark:text-red-500 dark:fill-red-500 flex-shrink-0" />
                            ) : deficit > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 fill-green-500 dark:text-green-500 dark:fill-green-500 flex-shrink-0" />
                            ) : (
                              <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 fill-gray-500 dark:text-gray-500 dark:fill-gray-500 flex-shrink-0" />
                            )}
                            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">
                              {deficit < 0 ? 'Calorie Deficit' : deficit > 0 ? 'Calorie Surplus' : 'Balanced'}
                            </span>
                          </div>
                          <div className={`font-bold font-mono text-xl md:text-2xl ${
                            deficit < 0 
                              ? 'text-red-500 dark:text-red-500' 
                              : deficit > 0
                              ? 'text-green-500 dark:text-green-500'
                              : 'text-gray-500 dark:text-gray-500'
                          }`}>
                            {deficit < 0 ? '-' : deficit > 0 ? '+' : ''}{Math.abs(deficit)}
                          </div>
                          <div className="text-[10px] md:text-xs text-dim font-mono mt-1">
                            {deficit < 0 
                              ? `burn ${Math.abs(deficit)} more than you eat` 
                              : deficit > 0
                              ? `eat ${deficit} more than you burn`
                              : 'maintain weight'}
                          </div>
                        </div>
                      )}
                      <div className="p-3 md:p-4 border border-emerald-500/30 dark:border-acid/30 rounded-sm bg-emerald-500/5 dark:bg-acid/5">
                        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                          <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 fill-emerald-500 dark:text-emerald-500 dark:fill-emerald-500 flex-shrink-0" />
                          <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Protein Target</span>
                        </div>
                        <div className="font-bold text-emerald-500 dark:text-text font-mono text-xl md:text-2xl">{profile?.protein_target || 150}g</div>
                        <div className="text-[10px] md:text-xs text-dim font-mono mt-1">grams per day</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                      <div className="p-3 md:p-4 border border-blue-500/30 dark:border-acid/30 rounded-sm bg-blue-500/5 dark:bg-acid/5">
                        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                          <Droplet className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500 flex-shrink-0" />
                          <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Water Goal</span>
                        </div>
                        <div className="font-bold text-blue-500 dark:text-text font-mono text-xl md:text-2xl">{profile?.water_goal || 2000}ml</div>
                        <div className="text-[10px] md:text-xs text-dim font-mono mt-1">milliliters per day</div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      <AchievementWidget />

      {/* Reminder Settings */}
      <ReminderSettingsSection />

      {/* Gender Selection Dialog (one-time for existing users) */}
      <GenderSelectionDialog
        open={showGenderDialog}
        onOpenChange={(open) => {
          setShowGenderDialog(open)
          // If user closes without selecting, remember dismissal so it doesn't show again
          if (!open && user && !profile?.gender) {
            const dismissedKey = `gender_dialog_dismissed_${user.id}`
            localStorage.setItem(dismissedKey, 'true')
          }
        }}
        onGenderSelected={handleGenderSelected}
      />

      {/* Update Targets Dialog */}
      {newTargets && profile && (
        <UpdateTargetsDialog
          open={showUpdateTargetsDialog}
          onOpenChange={setShowUpdateTargetsDialog}
          currentTargets={{
            calories: profile.calorie_target || profile.target_calories || 2000,
            protein: profile.protein_target || profile.target_protein || 150,
            water: profile.water_goal || 2000,
          }}
          newTargets={newTargets}
          onUpdate={handleUpdateTargets}
          onSkip={handleSkipTargetUpdate}
        />
      )}

      {/* Goals Change Confirmation Dialog */}
      {pendingGoalsChange && (
        <UpdateTargetsDialog
          open={showGoalsChangeDialog}
          onOpenChange={setShowGoalsChangeDialog}
          currentTargets={pendingGoalsChange.currentTargets}
          newTargets={pendingGoalsChange.newTargets}
          onUpdate={handleConfirmGoalsChange}
          onSkip={handleCancelGoalsChange}
          description="We've recalculated your personalized targets based on your goal changes. Would you like to update them?"
        />
      )}
    </div>
  )
}
