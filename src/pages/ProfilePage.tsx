import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'
import { ReminderSettingsSection } from '@/components/ReminderSettings'
import { getLatestWeight } from '@/services/weightTracking'
import AchievementWidget from '@/components/AchievementWidget'
import { GenderSelectionDialog } from '@/components/GenderSelectionDialog'
import { UpdateTargetsDialog } from '@/components/UpdateTargetsDialog'
import { calculatePersonalizedTargets } from '@/services/personalizedTargets'
import { Edit, X, User, Target, Activity, UtensilsCrossed, Flame, Droplet, Mail, CheckCircle2, Scale, UserCircle, Calendar, Weight, Beef, TrendingDown, TrendingUp } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Set up realtime subscription for user profile
  useUserRealtimeSubscription('user_profiles', ['profile'], user?.id)
  useUserRealtimeSubscription('weight_logs', ['latestWeight'], user?.id)
  
  // Weight tracking - for displaying in Personal Information section
  const { data: latestWeight } = useQuery({
    queryKey: ['latestWeight'],
    queryFn: getLatestWeight,
  })
  
  // Dialog states
  const [showGenderDialog, setShowGenderDialog] = useState(false)
  const [showUpdateTargetsDialog, setShowUpdateTargetsDialog] = useState(false)
  const [newTargets, setNewTargets] = useState<{
    calories: number
    protein: number
    water: number
  } | null>(null)
  
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    age: profile?.age || undefined,
    height: profile?.height || undefined,
    weight: profile?.weight || latestWeight?.weight || undefined,
    goal: profile?.goal || 'maintain',
    activity_level: profile?.activity_level || 'moderate',
    dietary_preference: profile?.dietary_preference || 'flexitarian',
    calorie_target: profile?.calorie_target || profile?.target_calories || 2000,
    protein_target: profile?.protein_target || profile?.target_protein || 150,
    water_goal: profile?.water_goal || 2000,
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
        activity_level: profile?.activity_level || 'moderate',
        dietary_preference: profile?.dietary_preference || 'flexitarian',
        calorie_target: profile?.calorie_target || profile?.target_calories || 2000,
        protein_target: profile?.protein_target || profile?.target_protein || 150,
        water_goal: profile?.water_goal || 2000,
      })
    }
  }, [profile, latestWeight, editing])

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      if (!user) throw new Error('Not authenticated')
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setEditing(false)
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
      if (profile.weight && profile.height && profile.age && profile.goal && profile.activity_level) {
        const isMale = gender === 'male'
        
        // Calculate NEW targets with the selected gender
        const newTargets = calculatePersonalizedTargets({
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          goal: profile.goal,
          activityLevel: profile.activity_level,
          dietaryPreference: profile.dietary_preference,
          isMale, // Use the NEW gender value
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
          target_calories: newTargets.calories,
          protein_target: newTargets.protein,
          target_protein: newTargets.protein,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Map formData to match database schema (support both field variants)
    // Note: gender is NOT included here - it cannot be changed after onboarding
    const updateData: Partial<UserProfile> = {
      name: formData.name || undefined,
      age: formData.age || undefined,
      height: formData.height || undefined,
      weight: formData.weight || undefined,
      goal: formData.goal,
      activity_level: formData.activity_level,
      dietary_preference: formData.dietary_preference,
      calorie_target: formData.calorie_target,
      target_calories: formData.calorie_target,
      protein_target: formData.protein_target,
      target_protein: formData.protein_target,
      water_goal: formData.water_goal,
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
              onClick={() => setEditing(true)}
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
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Goal</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value as any })}
                className="input-modern text-sm md:text-base"
              >
                <option value="lose_weight">Lose Weight</option>
                <option value="gain_muscle">Gain Muscle</option>
                <option value="maintain">Maintain</option>
                <option value="improve_fitness">Improve Fitness</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Activity Level</label>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value as any })}
                className="input-modern text-sm md:text-base"
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
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
                  value={formData.calorie_target}
                  onChange={(e) => setFormData({ ...formData, calorie_target: Number(e.target.value) })}
                  className="input-modern text-sm md:text-base"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Protein Target (g)</label>
                <input
                  type="number"
                  value={formData.protein_target}
                  onChange={(e) => setFormData({ ...formData, protein_target: Number(e.target.value) })}
                  className="input-modern text-sm md:text-base"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">Water Goal (ml)</label>
                <input
                  type="number"
                  value={formData.water_goal}
                  onChange={(e) => setFormData({ ...formData, water_goal: Number(e.target.value) })}
                  className="input-modern text-sm md:text-base"
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-border">
              <button
                type="submit"
                className="btn-primary gap-2"
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
                    activity_level: profile?.activity_level || 'moderate',
                    dietary_preference: profile?.dietary_preference || 'flexitarian',
                    calorie_target: profile?.calorie_target || profile?.target_calories || 2000,
                    protein_target: profile?.protein_target || profile?.target_protein || 150,
                    water_goal: profile?.water_goal || 2000,
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
                  <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Goal</span>
                </div>
                <div className="font-bold text-text font-mono capitalize text-base md:text-lg">{profile?.goal?.replace('_', ' ') || 'Not set'}</div>
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

            <div className="pt-3 md:pt-4 border-t border-border">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
                </div>
                <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Daily Targets</h3>
              </div>
              {/* Calculate TDEE and deficit if we have required data */}
              {(() => {
                const hasRequiredData = profile?.weight && profile?.height && profile?.age && profile?.goal && profile?.activity_level && profile?.gender
                let tdee: number | null = null
                let deficit: number | null = null
                
                if (hasRequiredData) {
                  const targets = calculatePersonalizedTargets({
                    weight: profile.weight!,
                    height: profile.height!,
                    age: profile.age!,
                    goal: profile.goal!,
                    activityLevel: profile.activity_level!,
                    dietaryPreference: profile.dietary_preference,
                    isMale: profile.gender === 'male',
                  })
                  tdee = targets.tdee
                  deficit = targets.calorie_deficit
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
    </div>
  )
}
