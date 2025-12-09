import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'
import { ReminderSettingsSection } from '@/components/ReminderSettings'
import { getLatestWeight } from '@/services/weightTracking'
import AchievementWidget from '@/components/AchievementWidget'
import { Edit, X, User, Target, Activity, UtensilsCrossed, Flame, Droplet, Mail, CheckCircle2, Scale, ArrowRight, Shield, UserCircle, Calendar, Weight, Beef } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function ProfilePage() {
  const { user, profile, isGuest } = useAuth()
  const queryClient = useQueryClient()

  // Set up realtime subscription for user profile
  useUserRealtimeSubscription('user_profiles', ['profile'], user?.id)
  useUserRealtimeSubscription('weight_logs', ['latestWeight'], user?.id)
  
  // Weight tracking - for displaying in Personal Information section
  const { data: latestWeight } = useQuery({
    queryKey: ['latestWeight'],
    queryFn: getLatestWeight,
  })
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Map formData to match database schema (support both field variants)
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

      {/* Guest Account Creation Banner */}
      {isGuest && (
        <div className="card-modern border-acid/50 bg-acid/5 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex items-start gap-3 md:gap-4 flex-1">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-acid" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-base font-bold text-text uppercase tracking-wider font-mono mb-1 md:mb-2">
                  Create Your Account
                </h3>
                <p className="text-xs md:text-sm text-dim font-mono mb-2 md:mb-3 leading-relaxed">
                  You're currently using NutriScope as a guest. Create a free account to secure your data and access it from any device.
                </p>
                <p className="text-[10px] md:text-xs text-acid/80 font-mono">
                  <CheckCircle2 className="w-4 h-4 inline-block mr-1" /> All your current data will be automatically migrated
                </p>
              </div>
            </div>
            <Link
              to="/auth"
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm md:text-base py-2.5 md:py-3 px-4 md:px-6 font-mono uppercase tracking-wider whitespace-nowrap"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </Link>
          </div>
        </div>
      )}

      <div className="card-modern border-acid/30 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
              <User className="w-4 h-4 md:w-5 md:h-5 text-acid" />
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
            {/* Basic Information - Name, Age, Height, Weight */}
            {(profile?.name || profile?.age || profile?.height || profile?.weight || latestWeight?.weight) && (
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
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                </div>
                <h3 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">Daily Targets</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="p-3 md:p-4 border border-orange-500/30 dark:border-acid/30 rounded-sm bg-orange-500/5 dark:bg-acid/5">
                  <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                    <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500 flex-shrink-0" />
                    <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Calorie Target</span>
                  </div>
                  <div className="font-bold text-orange-500 dark:text-acid font-mono text-xl md:text-2xl">{profile?.calorie_target || 2000}</div>
                  <div className="text-[10px] md:text-xs text-dim font-mono mt-1">calories per day</div>
                </div>
                <div className="p-3 md:p-4 border border-emerald-500/30 dark:border-acid/30 rounded-sm bg-emerald-500/5 dark:bg-acid/5">
                  <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                    <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 fill-emerald-500 dark:text-emerald-500 dark:fill-emerald-500 flex-shrink-0" />
                    <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Protein Target</span>
                  </div>
                  <div className="font-bold text-emerald-500 dark:text-text font-mono text-xl md:text-2xl">{profile?.protein_target || 150}g</div>
                  <div className="text-[10px] md:text-xs text-dim font-mono mt-1">grams per day</div>
                </div>
                <div className="p-3 md:p-4 border border-blue-500/30 dark:border-acid/30 rounded-sm bg-blue-500/5 dark:bg-acid/5">
                  <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                    <Droplet className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500 flex-shrink-0" />
                    <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Water Goal</span>
                  </div>
                  <div className="font-bold text-blue-500 dark:text-text font-mono text-xl md:text-2xl">{profile?.water_goal || 2000}ml</div>
                  <div className="text-[10px] md:text-xs text-dim font-mono mt-1">milliliters per day</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      <AchievementWidget />

      {/* Reminder Settings */}
      <ReminderSettingsSection />
    </div>
  )
}
