import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { calculatePersonalizedTargets } from "@/services/personalizedTargets"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase, isUsingDummyClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import type { UserGoal, UserGoalType, UserGoals, DietaryPreference, ActivityLevel } from "@/types"
import { ArrowRight, User, TrendingDown, Dumbbell, Activity, Heart, UtensilsCrossed, Leaf, Fish, Apple, Footprints, Coffee, Briefcase, Zap, Sparkles, CheckCircle2, TrendingUp, Target, Zap as EnergyIcon } from "lucide-react"

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(13).max(120).optional(),
  // Metric fields
  weight: z.number().min(30).max(300).optional(),   // kg - current weight
  height: z.number().min(100).max(250).optional(),  // cm
  target_weight: z.number().min(30).max(300).optional(), // kg - target weight
  timeframe_months: z.number().min(1).max(24).optional(), // months - duration to reach target
  // Unit system and imperial fields
  unit_system: z.enum(["metric", "imperial"]),
  weight_lbs: z.number().min(66).max(660).optional(), // ~30–300 kg - current weight
  target_weight_lbs: z.number().min(66).max(660).optional(), // ~30–300 kg - target weight
  height_feet: z.number().min(3).max(8).optional(),
  height_inches: z.number().min(0).max(11).optional(),
  goal: z.enum(["lose_weight", "gain_muscle", "maintain", "improve_fitness"]).optional().or(z.string().optional()), // Keep for backward compatibility, accept any string
  goals: z.array(z.enum([
    "lose_weight", "gain_muscle", "gain_weight", "maintain", 
    "improve_fitness", "build_endurance", "improve_health", 
    "body_recomposition", "increase_energy", "reduce_body_fat"
  ])).min(1, "Please select at least one goal").optional(),
  dietary_preference: z.enum(["vegetarian", "non_vegetarian", "vegan", "flexitarian"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  gender: z.enum(["male", "female"], {
    required_error: "Please select male or female",
  }),
  target_protein: z.number().min(0).max(500).optional(),
  target_calories: z.number().min(0).max(10000).optional(),
  water_goal: z.number().min(500).max(10000).optional(),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

interface OnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  onComplete: () => void
}

export function OnboardingDialog({
  open,
  onOpenChange,
  userId,
  onComplete,
}: OnboardingDialogProps) {
  const [step, setStep] = useState(1)
  const { toast } = useToast()
  const { user } = useAuth()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      goal: "maintain",
      dietary_preference: "flexitarian",
      activity_level: "moderate",
      gender: "male",
      unit_system: "metric",
    },
  })

  const unitSystem = watch("unit_system")
  const weightLbs = watch("weight_lbs")
  const targetWeightLbs = watch("target_weight_lbs")
  const heightFeet = watch("height_feet")
  const heightInches = watch("height_inches")
  const timeframeMonths = watch("timeframe_months")

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const onSubmit = async (data: OnboardingForm) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID is required",
        variant: "destructive",
      })
      return
    }

    // For dummy client, skip database operations
    if (isUsingDummyClient) {
      toast({
        title: "Profile created!",
        description: "Welcome to NutriScope!",
      })
      onComplete()
      onOpenChange(false)
      return
    }

    try {
      // Save profile to Supabase (works for both anonymous and authenticated users)
      if (!supabase) {
        throw new Error('Database connection not available')
      }
      if (!supabase) {
        toast({
          title: "Error",
          description: "Database connection unavailable",
          variant: "destructive",
        })
        return
      }

      // Convert to metric for storage
      let weightKg: number | null = null
      let heightCm: number | null = null
      
      if (data.unit_system === "metric") {
        weightKg = data.weight ?? null
        heightCm = data.height ?? null
      } else {
        if (data.weight_lbs) {
          weightKg = data.weight_lbs * 0.453592
        }
        const ft = data.height_feet ?? 0
        const inch = data.height_inches ?? 0
        if (ft || inch) {
          heightCm = ft * 30.48 + inch * 2.54
        }
      }

      // Use target_calories/target_protein from form, convert to calorie_target/protein_target
      const calorieTarget = data.target_calories || 2000
      const proteinTarget = data.target_protein || 150

      // Build profile data - use only columns that exist in the database
      const profileData: Record<string, any> = {
        id: userId,
        name: data.name || null,
        age: data.age || null,
        weight: weightKg,
        height: heightCm,
        goal: data.goal || (data.goals && data.goals[0]) || 'maintain', // Backward compatibility
        goals: data.goals || (data.goal ? [data.goal] : ['maintain']), // New multi-selection
        target_weight: data.target_weight || (data.target_weight_lbs ? data.target_weight_lbs * 0.453592 : undefined), // Convert to kg if imperial
        timeframe_months: data.timeframe_months || undefined,
        dietary_preference: data.dietary_preference,
        activity_level: data.activity_level,
        gender: data.gender || null,
        calorie_target: calorieTarget,
        protein_target: proteinTarget,
        water_goal: data.water_goal || 2000,
        unit_system: data.unit_system || 'metric', // Save user's unit preference
        onboarding_completed: true, // Mark onboarding as completed
      }

      // Add email if user has one (not for anonymous/guest users)
      if (user?.email && !user.is_anonymous) {
        profileData.email = user.email
      }

      // Try upsert - use only columns that definitely exist
      const { error } = await supabase.from("user_profiles").upsert(profileData, {
        onConflict: 'id'
      })

      if (error) {
        console.error("Onboarding upsert error:", error)
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        console.error("Profile data attempted:", profileData)
        throw new Error(error.message || `Failed to create profile: ${JSON.stringify(error)}`)
      }

      // Verify profile was created (with retry for eventual consistency)
      let profileVerified = false
      for (let i = 0; i < 3; i++) {
        const { data: verifyData } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle()
        
        if (verifyData) {
          profileVerified = true
          break
        }
        
        // Wait before retry
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      if (!profileVerified) {
        console.warn("Profile verification failed, but continuing anyway")
      }

      toast({
        title: "Profile created!",
        description: "Welcome to NutriScope!",
      })
      
      onComplete()
      onOpenChange(false)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create profile"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const goal = watch("goal") // Single goal for backward compatibility
  const goals = watch("goals") || [] // Array of goals (new multi-selection)
  const dietaryPreference = watch("dietary_preference")
  const activityLevel = watch("activity_level")
  const age = watch("age")
  const weight = watch("weight")
  const height = watch("height")
  const gender = watch("gender")
  
  // Use goals array if available, otherwise fall back to single goal
  const activeGoals: UserGoals = (goals && goals.length > 0) 
    ? (goals as UserGoalType[]).filter((g): g is UserGoalType => 
        ['lose_weight', 'gain_muscle', 'gain_weight', 'maintain', 'improve_fitness', 'build_endurance', 'improve_health', 'body_recomposition', 'increase_energy', 'reduce_body_fat'].includes(g as UserGoalType)
      ) as UserGoals
    : (goal ? [goal as UserGoalType] : ['maintain']) as UserGoals

  // Helper function to get metric values from either unit system
  function getMetricValues() {
    const unit = unitSystem
    let weightKg: number | undefined
    let targetWeightKg: number | undefined
    let heightCm: number | undefined
    
    if (unit === "metric") {
      weightKg = weight
      targetWeightKg = watch("target_weight")
      heightCm = height
    } else {
      if (weightLbs) {
        weightKg = weightLbs * 0.453592
      }
      if (targetWeightLbs) {
        targetWeightKg = targetWeightLbs * 0.453592
      }
      if (heightFeet != null || heightInches != null) {
        const ft = heightFeet || 0
        const inch = heightInches || 0
        heightCm = ft * 30.48 + inch * 2.54
      }
    }
    
    return { weightKg, targetWeightKg, heightCm }
  }

  // Calculate personalized targets when moving to step 3
  useEffect(() => {
    if (step === 3 && age && activeGoals.length > 0 && activityLevel && gender) {
      const { weightKg, targetWeightKg, heightCm } = getMetricValues()
      if (!weightKg || !heightCm) return
      
      const isMale = gender === "male"
      const currentTimeframeMonths = watch("timeframe_months")
      
      // Use goals array (supports multi-selection)
      const targets = calculatePersonalizedTargets({
        weight: weightKg,
        height: heightCm,
        age,
        goal: activeGoals, // Pass array of goals
        activityLevel,
        dietaryPreference,
        isMale,
        targetWeight: targetWeightKg, // Optional target weight
        timeframeMonths: currentTimeframeMonths, // Optional timeframe in months
      })

      // Pre-fill the target fields with calculated values
      setValue("target_calories", targets.calorie_target)
      setValue("target_protein", targets.protein_target)
      setValue("water_goal", targets.water_goal)
    }
  }, [step, weight, weightLbs, targetWeightLbs, height, heightFeet, heightInches, age, activeGoals, activityLevel, dietaryPreference, gender, setValue, unitSystem, timeframeMonths])

  // Calculate personalized explanation for step 3
  const personalizedExplanation = useMemo(() => {
    if (step !== 3) return ""
    if (!age || activeGoals.length === 0 || !activityLevel || !gender) return ""
    
    const { weightKg, targetWeightKg, heightCm } = getMetricValues()
    if (!weightKg || !heightCm) {
      return ""
    }
    
    try {
      const isMale = gender === "male"
      const currentTimeframeMonths = watch("timeframe_months")
      const targets = calculatePersonalizedTargets({
        weight: weightKg,
        height: heightCm,
        age,
        goal: activeGoals, // Pass array of goals
        activityLevel,
        dietaryPreference,
        isMale,
        targetWeight: targetWeightKg, // Optional target weight
        timeframeMonths: currentTimeframeMonths, // Optional timeframe in months
      })
      return targets.explanation || ""
    } catch (error) {
      console.error('[Onboarding] Error calculating personalized explanation:', error)
      return ""
    }
  }, [step, weight, weightLbs, targetWeightLbs, height, heightFeet, heightInches, age, activeGoals, activityLevel, dietaryPreference, gender, unitSystem, timeframeMonths])

  const goalIcons: Record<UserGoalType, typeof TrendingDown> = {
    lose_weight: TrendingDown,
    gain_muscle: Dumbbell,
    gain_weight: TrendingUp,
    maintain: Heart,
    improve_fitness: Activity,
    build_endurance: Activity,
    improve_health: Heart,
    body_recomposition: Target,
    increase_energy: EnergyIcon,
    reduce_body_fat: TrendingDown,
  }
  
  // All available goals with labels and colors
  const allGoals: Array<{ value: UserGoalType; label: string; icon: typeof TrendingDown; color: string; bgColor: string; description: string }> = [
    { value: "lose_weight", label: "Lose Weight", icon: TrendingDown, color: "#10B981", bgColor: "rgba(16, 185, 129, 0.15)", description: "Reduce overall body weight" },
    { value: "gain_muscle", label: "Gain Muscle", icon: Dumbbell, color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.15)", description: "Build lean muscle mass" },
    { value: "gain_weight", label: "Gain Weight", icon: TrendingUp, color: "#F97316", bgColor: "rgba(249, 115, 22, 0.15)", description: "Increase overall body weight" },
    { value: "maintain", label: "Maintain Weight", icon: Heart, color: "#EC4899", bgColor: "rgba(236, 72, 153, 0.15)", description: "Keep current weight" },
    { value: "improve_fitness", label: "Improve Fitness", icon: Activity, color: "#3B82F6", bgColor: "rgba(59, 130, 246, 0.15)", description: "Enhance overall fitness" },
    { value: "build_endurance", label: "Build Endurance", icon: Activity, color: "#06B6D4", bgColor: "rgba(6, 182, 212, 0.15)", description: "Improve stamina and endurance" },
    { value: "improve_health", label: "Improve Health", icon: Heart, color: "#8B5CF6", bgColor: "rgba(139, 92, 246, 0.15)", description: "Focus on overall health" },
    { value: "body_recomposition", label: "Body Recomposition", icon: Target, color: "#6366F1", bgColor: "rgba(99, 102, 241, 0.15)", description: "Lose fat, gain muscle" },
    { value: "increase_energy", label: "Increase Energy", icon: EnergyIcon, color: "#FBBF24", bgColor: "rgba(251, 191, 36, 0.15)", description: "Boost daily energy levels" },
    { value: "reduce_body_fat", label: "Reduce Body Fat", icon: TrendingDown, color: "#14B8A6", bgColor: "rgba(20, 184, 166, 0.15)", description: "Lower body fat percentage" },
  ]

  const dietaryIcons = {
    vegetarian: Leaf,
    non_vegetarian: Fish,
    vegan: Apple,
    flexitarian: UtensilsCrossed,
  }

  const activityIcons = {
    sedentary: Briefcase,
    light: Coffee,
    moderate: Footprints,
    active: Activity,
    very_active: Zap,
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] border-none bg-transparent shadow-none p-0" 
        onInteractOutside={(e) => e.preventDefault()}
        hideClose={true}
      >
        <div
          className="
            bg-surface text-text
            rounded-2xl border border-border/70 
            shadow-xl shadow-black/10
            p-5 sm:p-6 md:p-8
            max-h-[90vh] overflow-y-auto scrollbar-hide
          "
      >
        <div className="relative">
          <DialogHeader className="mb-6">
              <div className="inline-flex text-[11px] font-bold font-mono bg-accent-soft/50 border border-accent/40 rounded-full px-3 py-1.5 gap-2 items-center mb-4" style={{ color: '#0D9488' }}>
              <div className="flex items-center gap-1">
                <span className="inline-flex h-2 w-2 rounded-full bg-orange-500 shadow-sm"></span>
                <span className="inline-flex h-2 w-2 rounded-full bg-purple-500 shadow-sm"></span>
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 shadow-sm"></span>
              </div>
              Personalization Setup
            </div>
            <DialogTitle className="text-3xl sm:text-4xl tracking-tight text-text font-mono">
              Welcome to NutriScope!
            </DialogTitle>
            <DialogDescription className="text-base text-dim mt-2">
              Let's set up your profile so we can provide personalized guidance tailored to your goals.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center text-sm font-bold font-mono">
              <span className="text-text font-semibold">Step {step} of {totalSteps}</span>
              <span className="text-acid font-bold text-base" style={{ color: '#0D9488' }}>{Math.round(progress)}% Complete</span>
            </div>
            <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              <div
                className="absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-full shadow-sm"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #0D9488 0%, #14B8A6 100%)'
                }}
              />
            </div>
            
            {/* Step indicators */}
            <div className="flex justify-between mt-4">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex flex-col items-center flex-1">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-mono text-base font-bold transition-all ${
                    stepNum < step 
                      ? "text-white shadow-lg scale-105" 
                      : stepNum === step 
                      ? "text-white ring-4 shadow-xl scale-110" 
                      : "bg-panel text-dim border border-border/80"
                  }`}
                  style={stepNum <= step ? {
                    background: stepNum < step 
                      ? 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)'
                      : 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                    boxShadow: stepNum === step 
                      ? '0 0 0 4px rgba(20, 184, 166, 0.3), 0 4px 12px rgba(20, 184, 166, 0.4)'
                      : '0 4px 12px rgba(20, 184, 166, 0.3)'
                  } : {}}
                  >
                    {stepNum < step ? (
                      <CheckCircle2 className="w-7 h-7 text-white stroke-[3]" />
                    ) : (
                      <span className="text-lg">{stepNum}</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-mono font-bold ${
                    stepNum <= step ? "font-bold" : "text-gray-400 dark:text-gray-500"
                  }`}
                  style={stepNum <= step ? { color: '#0D9488' } : {}}
                  >
                    {stepNum === 1 ? "Basic Info" : stepNum === 2 ? "Goals" : "Targets"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-text font-mono mb-2 block">
                    What's your name?
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dim" />
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Enter your name"
                      className="pl-12 bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-error mt-2 font-mono">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <Label className="text-sm font-medium text-text font-mono mb-3 block">
                    Sex (for calorie & BMR calculation)
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ].map((option) => {
                      const isSelected = gender === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue("gender", option.value as "male" | "female")}
                          className={`relative rounded-sm p-3 border-2 transition-all font-mono text-center ${
                            isSelected
                              ? "bg-accent-soft/50 ring-2"
                              : "border-border bg-surface hover:border-dim"
                          }`}
                          style={
                            isSelected
                              ? {
                                  borderColor: "#0D9488",
                                  boxShadow: "0 0 0 2px rgba(13, 148, 136, 0.2)",
                                }
                              : {}
                          }
                        >
                          <span
                            className={`text-xs block font-medium ${isSelected ? "text-text" : "text-dim"}`}
                          >
                            {option.label}
                          </span>
                          {isSelected && (
                            <div
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                              style={{ backgroundColor: "#0D9488" }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {errors.gender && (
                    <p className="text-sm text-error mt-2 font-mono">
                      {errors.gender.message}
                    </p>
                  )}
                </div>

                {/* Age - Separate */}
                <div>
                  <Label htmlFor="age" className="text-sm font-medium text-text font-mono mb-2 block">
                    Age (optional)
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    {...register("age", { valueAsNumber: true })}
                    placeholder="25"
                    className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                  />
                </div>

                {/* Weight & Height with Unit Toggle */}
                <div className="space-y-4">
                  {/* Unit System Toggle */}
                  <div>
                    <Label className="text-sm font-medium text-text font-mono mb-2 block">
                      Units for Weight & Height
                    </Label>
                    <div className="inline-flex rounded-md border border-border/70 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setValue("unit_system", "metric")}
                        className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                          unitSystem === "metric"
                            ? "bg-accent text-white"
                            : "bg-panel text-dim hover:bg-panel/80"
                        }`}
                      >
                        Metric (kg / cm)
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue("unit_system", "imperial")}
                        className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                          unitSystem === "imperial"
                            ? "bg-accent text-white"
                            : "bg-panel text-dim hover:bg-panel/80"
                        }`}
                      >
                        Imperial (lbs / ft+in)
                      </button>
                    </div>
                  </div>

                  {/* Weight & Height Inputs */}
                  {unitSystem === "metric" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="weight" className="text-sm font-medium text-text font-mono mb-2 block">
                          Weight (kg, optional)
                        </Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          {...register("weight", { valueAsNumber: true })}
                          placeholder="70"
                          className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-sm font-medium text-text font-mono mb-2 block">
                          Height (cm, optional)
                        </Label>
                        <Input
                          id="height"
                          type="number"
                          {...register("height", { valueAsNumber: true })}
                          placeholder="175"
                          className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="weight_lbs" className="text-sm font-medium text-text font-mono mb-2 block">
                          Weight (lbs, optional)
                        </Label>
                        <Input
                          id="weight_lbs"
                          type="number"
                          step="0.1"
                          {...register("weight_lbs", { valueAsNumber: true })}
                          placeholder="154"
                          className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="height_feet" className="text-sm font-medium text-text font-mono mb-2 block">
                            Height (ft)
                          </Label>
                          <Input
                            id="height_feet"
                            type="number"
                            {...register("height_feet", { valueAsNumber: true })}
                            placeholder="5"
                            className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                          />
                        </div>
                        <div>
                          <Label htmlFor="height_inches" className="text-sm font-medium text-text font-mono mb-2 block">
                            Height (in)
                          </Label>
                          <Input
                            id="height_inches"
                            type="number"
                            {...register("height_inches", { valueAsNumber: true })}
                            placeholder="8"
                            className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setStep(2)} 
                    className="group inline-flex items-center gap-3"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 text-current transition-transform duration-300 group-hover:translate-x-0.5" style={{ color: 'var(--color-on-acid)' }} />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-text font-mono mb-2 block">
                    What are your goals? (Select one or more)
                  </Label>
                  <p className="text-xs text-dim font-mono mb-3">
                    You can select multiple goals. We'll personalize your targets based on your selections.
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto scrollbar-hide">
                    {allGoals.map((option) => {
                      const Icon = goalIcons[option.value]
                      const isSelected = goals.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            const currentGoals = goals || []
                            if (isSelected) {
                              // Remove if already selected
                              setValue("goals", currentGoals.filter(g => g !== option.value) as UserGoals)
                              // Also update single goal for backward compatibility
                              const remainingGoals = currentGoals.filter(g => g !== option.value)
                              if (remainingGoals.length === 0) {
                                setValue("goal", undefined)
                              } else {
                                // Use first remaining goal, but only if it's in the old enum
                                const firstRemaining = remainingGoals[0]
                                const validOldGoals: UserGoal[] = ['lose_weight', 'gain_muscle', 'maintain', 'improve_fitness']
                                if (validOldGoals.includes(firstRemaining as UserGoal)) {
                                  setValue("goal", firstRemaining as UserGoal)
                                } else {
                                  setValue("goal", undefined)
                                }
                              }
                            } else {
                              // Add to selection
                              const newGoals = [...currentGoals, option.value] as UserGoals
                              setValue("goals", newGoals)
                              // Also update single goal for backward compatibility (use first selected that's in old enum)
                              // Find first goal that's a valid old goal type
                              const firstValidGoal = newGoals.find(g => 
                                g === 'lose_weight' || g === 'gain_muscle' || g === 'maintain' || g === 'improve_fitness'
                              ) as UserGoal | undefined
                              if (firstValidGoal) {
                                setValue("goal", firstValidGoal)
                              }
                            }
                          }}
                          className={`relative rounded-sm p-4 border-2 transition-all font-mono text-left ${
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
                          <div className="flex items-center gap-3">
                            <div className="flex w-10 h-10 rounded-sm items-center justify-center flex-shrink-0" style={{ backgroundColor: isSelected ? option.bgColor : `${option.color}1A` }}>
                              <Icon className="w-5 h-5" style={{ color: option.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-text block">{option.label}</span>
                              <span className="text-[10px] text-dim mt-0.5 block">{option.description}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#0D9488' }}>
                              <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {goals.length > 0 && (
                    <p className="text-xs text-accent font-mono mt-3">
                      {goals.length} goal{goals.length > 1 ? 's' : ''} selected: {goals.map(g => allGoals.find(ag => ag.value === g)?.label).join(', ')}
                    </p>
                  )}
                </div>

                {/* Target Weight and Timeframe Section */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div>
                    <Label className="text-sm font-medium text-text font-mono mb-2 block">
                      Target Weight & Timeframe (Optional)
                    </Label>
                    <p className="text-xs text-dim font-mono mb-3">
                      Set your target weight and timeframe to get personalized calorie targets based on your goals.
                    </p>
                    
                    {unitSystem === "metric" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="target_weight" className="text-xs font-medium text-text font-mono mb-2 block">
                            Target Weight (kg)
                          </Label>
                          <Input
                            id="target_weight"
                            type="number"
                            step="0.1"
                            {...register("target_weight", { valueAsNumber: true })}
                            placeholder={weight ? `${weight}` : "e.g., 65"}
                            className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                          />
                        </div>
                        <div>
                          <Label htmlFor="timeframe_months" className="text-xs font-medium text-text font-mono mb-2 block">
                            Timeframe (months)
                          </Label>
                          <Input
                            id="timeframe_months"
                            type="number"
                            min="1"
                            max="24"
                            {...register("timeframe_months", { valueAsNumber: true })}
                            placeholder="e.g., 3"
                            className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="target_weight_lbs" className="text-xs font-medium text-text font-mono mb-2 block">
                            Target Weight (lbs)
                          </Label>
                          <Input
                            id="target_weight_lbs"
                            type="number"
                            step="0.1"
                            {...register("target_weight_lbs", { valueAsNumber: true })}
                            placeholder={weightLbs ? `${weightLbs}` : "e.g., 143"}
                            className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                          />
                        </div>
                        <div>
                          <Label htmlFor="timeframe_months" className="text-xs font-medium text-text font-mono mb-2 block">
                            Timeframe (months)
                          </Label>
                          <Input
                            id="timeframe_months"
                            type="number"
                            min="1"
                            max="24"
                            {...register("timeframe_months", { valueAsNumber: true })}
                            placeholder="e.g., 3"
                            className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                          />
                        </div>
                      </div>
                    )}
                    
                    {(() => {
                      const { weightKg, targetWeightKg } = getMetricValues()
                      const months = timeframeMonths
                      if (weightKg && targetWeightKg && months) {
                        const weightDiff = targetWeightKg - weightKg
                        const weeklyChange = weightDiff / (months * 4.33) // Average weeks per month
                        const weeklyChangeLbs = weeklyChange * 2.20462
                        return (
                          <div className="mt-3 p-3 bg-accent-soft/50 border border-accent/30 rounded-sm">
                            <p className="text-xs font-mono text-text">
                              <strong>Projected:</strong> {weightDiff > 0 ? 'Gain' : 'Lose'} {Math.abs(weightDiff).toFixed(1)} kg ({Math.abs(weightDiff * 2.20462).toFixed(1)} lbs) over {months} month{months > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs font-mono text-dim mt-1">
                              Target: {Math.abs(weeklyChange).toFixed(2)} kg/week ({Math.abs(weeklyChangeLbs).toFixed(2)} lbs/week)
                            </p>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-text font-mono mb-3 block">
                    Dietary Preference
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { value: "vegetarian", label: "Vegetarian", icon: Leaf },
                      { value: "non_vegetarian", label: "Non-Veg", icon: Fish },
                      { value: "vegan", label: "Vegan", icon: Apple },
                      { value: "flexitarian", label: "Flexitarian", icon: UtensilsCrossed },
                    ].map((option) => {
                      const Icon = dietaryIcons[option.value as DietaryPreference]
                      const isSelected = dietaryPreference === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue("dietary_preference", option.value as DietaryPreference)}
                          className={`relative rounded-sm p-3 border-2 transition-all font-mono text-center ${
                            isSelected
                              ? "bg-acid/10 ring-2"
                              : "border-border bg-surface hover:border-dim"
                          }`}
                          style={isSelected ? { 
                            borderColor: '#0D9488',
                            boxShadow: '0 0 0 2px rgba(13, 148, 136, 0.2)'
                          } : {}}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-accent' : 'text-dim'}`} />
                          <span className={`text-xs block font-medium ${isSelected ? 'text-text' : 'text-dim'}`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#0D9488' }}>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-text font-mono mb-3 block">
                    Activity Level
                  </Label>
                  <p className="text-xs text-dim mb-3 font-mono">
                    Select the option that best matches your weekly exercise routine. This affects how many calories your body burns daily.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {[
                      { 
                        value: "sedentary", 
                        label: "Sedentary", 
                        icon: Briefcase,
                        description: "Little to no exercise",
                        multiplier: "1.2x",
                        examples: "Desk job, minimal walking"
                      },
                      { 
                        value: "light", 
                        label: "Light", 
                        icon: Coffee,
                        description: "Light exercise 1-3 days/week",
                        multiplier: "1.375x",
                        examples: "Walking, yoga, light workouts"
                      },
                      { 
                        value: "moderate", 
                        label: "Moderate", 
                        icon: Footprints,
                        description: "Moderate exercise 3-5 days/week",
                        multiplier: "1.55x",
                        examples: "30-60 min workouts, jogging, cycling"
                      },
                      { 
                        value: "active", 
                        label: "Active", 
                        icon: Activity,
                        description: "Heavy exercise 6-7 days/week",
                        multiplier: "1.725x",
                        examples: "Intense training, sports, long runs"
                      },
                      { 
                        value: "very_active", 
                        label: "Very Active", 
                        icon: Zap,
                        description: "Very heavy exercise + physical job",
                        multiplier: "1.9x",
                        examples: "Athletes, construction, 2x daily workouts"
                      },
                    ].map((option) => {
                      const Icon = activityIcons[option.value as ActivityLevel]
                      const isSelected = activityLevel === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue("activity_level", option.value as ActivityLevel)}
                          className={`relative rounded-sm p-3 border-2 transition-all font-mono text-left ${
                            isSelected
                              ? "bg-acid/10 ring-2 ring-acid border-acid"
                              : "border-border bg-surface hover:border-dim"
                          }`}
                          style={isSelected ? { 
                            borderColor: '#0D9488',
                            boxShadow: '0 0 0 2px rgba(13, 148, 136, 0.2)'
                          } : {}}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isSelected ? 'text-accent' : 'text-dim'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold">{option.label}</div>
                              <div className="text-[10px] text-dim mt-0.5">{option.multiplier}</div>
                            </div>
                          </div>
                          <div className="text-[10px] text-dim leading-tight">
                            {option.description}
                          </div>
                          <div className="text-[9px] text-dim mt-1 leading-tight italic">
                            {option.examples}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#0D9488' }}>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-dim mt-2 font-mono">
                    💡 Tip: Choose based on your typical week, not your best week. You can adjust this later in your profile.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)} 
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      // Validate at least one goal is selected
                      const currentGoals = watch("goals") || []
                      const currentGoal = watch("goal")
                      if (currentGoals.length === 0 && !currentGoal) {
                        toast({
                          title: "Please select at least one goal",
                          description: "Select one or more goals to continue.",
                          variant: "destructive",
                        })
                        return
                      }
                      
                      // Calculate personalized targets before moving to step 3
                      const currentAge = watch("age")
                      const currentActivityLevel = watch("activity_level")
                      const currentGender = watch("gender")
                      const currentDietaryPreference = watch("dietary_preference")
                      
                      // Get metric values (handles unit conversion for imperial/metric)
                      const { weightKg, targetWeightKg, heightCm } = getMetricValues()
                      const currentTimeframeMonths = watch("timeframe_months")
                      
                      const validGoalTypes: UserGoalType[] = ['lose_weight', 'gain_muscle', 'gain_weight', 'maintain', 'improve_fitness', 'build_endurance', 'improve_health', 'body_recomposition', 'increase_energy', 'reduce_body_fat']
                      const goalsToUse: UserGoals = (currentGoals && currentGoals.length > 0)
                        ? currentGoals.filter((g): g is UserGoalType => validGoalTypes.includes(g as UserGoalType)) as UserGoals
                        : (currentGoal && validGoalTypes.includes(currentGoal as UserGoalType) ? [currentGoal as UserGoalType] : ['maintain']) as UserGoals
                      
                      if (weightKg && heightCm && currentAge && goalsToUse.length > 0 && currentActivityLevel && currentGender) {
                        const isMale = currentGender === "male"
                        const targets = calculatePersonalizedTargets({
                          weight: weightKg,
                          height: heightCm,
                          age: currentAge,
                          goal: goalsToUse, // Pass array of goals
                          activityLevel: currentActivityLevel,
                          dietaryPreference: currentDietaryPreference,
                          isMale,
                          targetWeight: targetWeightKg, // Optional target weight
                          timeframeMonths: currentTimeframeMonths, // Optional timeframe in months
                        })
                        
                        // Pre-fill targets
                        setValue("target_calories", targets.calorie_target)
                        setValue("target_protein", targets.protein_target)
                        setValue("water_goal", targets.water_goal)
                      }
                      setStep(3)
                    }} 
                    className="group flex-1 inline-flex items-center gap-3"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 text-current transition-transform duration-300 group-hover:translate-x-0.5" style={{ color: 'var(--color-on-acid)' }} />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 md:space-y-6">
                {/* Personalized Explanation */}
                {personalizedExplanation && (
                  <div className="bg-accent-soft border border-accent/50 rounded-md p-3 md:p-4 animate-slide-up">
                    <div className="flex items-start gap-2 md:gap-3">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-accent flex-shrink-0 mt-0.5" style={{ color: '#0D9488' }} />
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-bold font-mono mb-2" style={{ color: '#0D9488' }}>✨ Personalized for You</p>
                        <p className="text-xs md:text-sm font-mono text-text whitespace-pre-line leading-relaxed">
                          {personalizedExplanation}
                        </p>
                        <p className="text-[10px] md:text-xs text-dim font-mono mt-2">
                          💡 You can adjust these values if needed
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="target_protein" className="text-sm font-medium text-text font-mono mb-2 block">
                    Target Protein (g/day)
                  </Label>
                  <Input
                    id="target_protein"
                    type="number"
                    {...register("target_protein", { valueAsNumber: true })}
                    placeholder="e.g., 150"
                    className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                  />
                </div>

                <div>
                  <Label htmlFor="target_calories" className="text-sm font-medium text-text font-mono mb-2 block">
                    Target Calories (kcal/day)
                  </Label>
                  <Input
                    id="target_calories"
                    type="number"
                    {...register("target_calories", { valueAsNumber: true })}
                    placeholder="e.g., 2000"
                    className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                  />
                </div>

                <div>
                  <Label htmlFor="water_goal" className="text-sm font-medium text-text font-mono mb-2 block">
                    Daily Water Goal (ml)
                  </Label>
                  <Input
                    id="water_goal"
                    type="number"
                    {...register("water_goal", { valueAsNumber: true })}
                    placeholder="e.g., 2000"
                    className="bg-panel/60 border-border/70 focus:border-accent focus:ring-1 focus:ring-accent/60"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="group flex-1 inline-flex items-center gap-3 whitespace-nowrap"
                  >
                    <span className="whitespace-nowrap">{isSubmitting ? "Creating..." : "Complete Setup"}</span>
                    {!isSubmitting && (
                      <ArrowRight className="w-4 h-4 text-current transition-transform duration-300 group-hover:translate-x-0.5 flex-shrink-0" style={{ color: 'var(--color-on-acid)' }} />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

