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
import type { UserGoal, DietaryPreference, ActivityLevel } from "@/types"
import { ArrowRight, User, TrendingDown, Dumbbell, Activity, Heart, UtensilsCrossed, Leaf, Fish, Apple, Footprints, Coffee, Briefcase, Zap, Sparkles, CheckCircle2 } from "lucide-react"

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(13).max(120).optional(),
  weight: z.number().min(30).max(300).optional(),
  height: z.number().min(100).max(250).optional(),
  goal: z.enum(["lose_weight", "gain_muscle", "maintain", "improve_fitness"]),
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
    },
  })

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

      // Use target_calories/target_protein from form, convert to calorie_target/protein_target
      const calorieTarget = data.target_calories || 2000
      const proteinTarget = data.target_protein || 150

      // Build profile data - use only calorie_target and protein_target (these definitely exist)
      const profileData: Record<string, any> = {
        id: userId,
        name: data.name || null,
        age: data.age || null,
        weight: data.weight || null,
        height: data.height || null,
        goal: data.goal,
        dietary_preference: data.dietary_preference,
        activity_level: data.activity_level,
        gender: data.gender || null,
        calorie_target: calorieTarget,
        protein_target: proteinTarget,
        water_goal: data.water_goal || 2000,
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

  const goal = watch("goal")
  const dietaryPreference = watch("dietary_preference")
  const activityLevel = watch("activity_level")
  const age = watch("age")
  const weight = watch("weight")
  const height = watch("height")
  const gender = watch("gender")

  // Calculate personalized targets when moving to step 3
  useEffect(() => {
    if (step === 3 && weight && height && age && goal && activityLevel && gender) {
      const isMale = gender === "male"
      
      const targets = calculatePersonalizedTargets({
        weight,
        height,
        age,
        goal,
        activityLevel,
        dietaryPreference,
        isMale,
      })

      // Pre-fill the target fields with calculated values
      setValue("target_calories", targets.calorie_target)
      setValue("target_protein", targets.protein_target)
      setValue("water_goal", targets.water_goal)
    }
  }, [step, weight, height, age, goal, activityLevel, dietaryPreference, gender, setValue])

  // Calculate personalized explanation for step 3
  const personalizedExplanation = useMemo(() => {
    if (step === 3 && weight && height && age && goal && activityLevel && gender) {
      const isMale = gender === "male"
      const targets = calculatePersonalizedTargets({
        weight,
        height,
        age,
        goal,
        activityLevel,
        dietaryPreference,
        isMale,
      })
      return targets.explanation
    }
    return ""
  }, [step, weight, height, age, goal, activityLevel, dietaryPreference, gender])

  const goalIcons = {
    lose_weight: TrendingDown,
    gain_muscle: Dumbbell,
    maintain: Heart,
    improve_fitness: Activity,
  }

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
                            className="text-xs block font-medium"
                            style={{ color: isSelected ? "#111827" : "#6B7280" }}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <Label className="text-sm font-medium text-text font-mono mb-3 block">
                    What's your primary goal?
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "lose_weight", label: "Lose Weight", icon: TrendingDown, color: "#10B981", bgColor: "rgba(16, 185, 129, 0.15)" }, // emerald-500
                      { value: "gain_muscle", label: "Gain Muscle", icon: Dumbbell, color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.15)" }, // amber-500
                      { value: "maintain", label: "Maintain Weight", icon: Heart, color: "#EC4899", bgColor: "rgba(236, 72, 153, 0.15)" }, // pink-500
                      { value: "improve_fitness", label: "Improve Fitness", icon: Activity, color: "#3B82F6", bgColor: "rgba(59, 130, 246, 0.15)" }, // blue-500
                    ].map((option) => {
                      const Icon = goalIcons[option.value as UserGoal]
                      const isSelected = goal === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue("goal", option.value as UserGoal)}
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
                            <div className="flex w-10 h-10 rounded-sm items-center justify-center" style={{ backgroundColor: isSelected ? option.bgColor : `${option.color}1A` }}>
                              <Icon className="w-5 h-5" style={{ color: option.color }} />
                            </div>
                            <span className="font-medium text-text">{option.label}</span>
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
                          <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: isSelected ? '#0D9488' : '#6B7280' }} />
                          <span className={`text-xs block font-medium`} style={{ color: isSelected ? '#111827' : '#6B7280' }}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {[
                      { value: "sedentary", label: "Sedentary", icon: Briefcase },
                      { value: "light", label: "Light", icon: Coffee },
                      { value: "moderate", label: "Moderate", icon: Footprints },
                      { value: "active", label: "Active", icon: Activity },
                      { value: "very_active", label: "Very Active", icon: Zap },
                    ].map((option) => {
                      const Icon = activityIcons[option.value as ActivityLevel]
                      const isSelected = activityLevel === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue("activity_level", option.value as ActivityLevel)}
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
                          <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: isSelected ? '#0D9488' : '#6B7280' }} />
                          <span className={`text-xs block font-medium`} style={{ color: isSelected ? '#111827' : '#6B7280' }}>
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
                      // Calculate personalized targets before moving to step 3
                      const currentWeight = watch("weight")
                      const currentHeight = watch("height")
                      const currentAge = watch("age")
                      const currentGoal = watch("goal")
                      const currentActivityLevel = watch("activity_level")
                      const currentGender = watch("gender")
                      
                      if (currentWeight && currentHeight && currentAge && currentGoal && currentActivityLevel && currentGender) {
                        const isMale = currentGender === "male"
                        const targets = calculatePersonalizedTargets({
                          weight: currentWeight,
                          height: currentHeight,
                          age: currentAge,
                          goal: currentGoal,
                          activityLevel: currentActivityLevel,
                          dietaryPreference: watch("dietary_preference"),
                          isMale,
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

