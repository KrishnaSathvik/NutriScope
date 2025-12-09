import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import type { UserGoal, DietaryPreference, ActivityLevel } from "@/types"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, User, TrendingDown, Dumbbell, Activity, Heart, UtensilsCrossed, Leaf, Fish, Apple, Footprints, Coffee, Briefcase, Zap, Droplet, Lightbulb } from "lucide-react"

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(13).max(120).optional(),
  weight: z.number().min(30).max(300).optional(),
  height: z.number().min(100).max(250).optional(),
  goal: z.enum(["lose_weight", "gain_muscle", "maintain", "improve_fitness"]),
  dietary_preference: z.enum(["vegetarian", "non_vegetarian", "vegan", "flexitarian"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
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

      const { error } = await supabase.from("user_profiles").upsert({
        id: userId,
        name: data.name,
        age: data.age,
        weight: data.weight,
        height: data.height,
        goal: data.goal,
        dietary_preference: data.dietary_preference,
        activity_level: data.activity_level,
        target_protein: data.target_protein,
        target_calories: data.target_calories,
        water_goal: data.water_goal || 2000,
      })

      if (error) throw error

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
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto card-modern" 
        onInteractOutside={(e) => e.preventDefault()}
        hideClose={true}
      >
        <div className="relative">
          <DialogHeader className="mb-6">
            <div className="inline-flex text-xs text-acid font-mono bg-surface border border-border rounded-full px-3 py-1 gap-2 items-center mb-4">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-acid"></span>
              Personalization Setup
            </div>
            <DialogTitle className="text-3xl sm:text-4xl tracking-tight text-text font-mono flex items-center gap-2">
              Welcome to NutriScope!
            </DialogTitle>
            <DialogDescription className="text-base text-dim mt-2">
              Let's set up your profile so we can provide personalized guidance tailored to your goals.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center text-sm text-dim font-mono">
              <span className="font-medium">Step {step} of {totalSteps}</span>
              <span className="text-xs">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators */}
            <div className="flex justify-between mt-4">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-medium transition-all ${
                    stepNum < step 
                      ? "bg-acid text-void" 
                      : stepNum === step 
                      ? "bg-acid text-void ring-4 ring-acid/20" 
                      : "bg-panel text-dim border border-border"
                  }`}>
                    {stepNum < step ? "✓" : stepNum}
                  </div>
                  <span className={`text-xs mt-2 font-mono ${
                    stepNum <= step ? "text-text font-medium" : "text-dim"
                  }`}>
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
                      className="pl-12"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-error mt-2 font-mono">
                      {errors.name.message}
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
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
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
                      { value: "lose_weight", label: "Lose Weight", icon: TrendingDown, color: "emerald" },
                      { value: "gain_muscle", label: "Gain Muscle", icon: Dumbbell, color: "orange" },
                      { value: "maintain", label: "Maintain Weight", icon: Heart, color: "pink" },
                      { value: "improve_fitness", label: "Improve Fitness", icon: Activity, color: "blue" },
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
                              ? "border-acid bg-acid/10 ring-2 ring-acid/20"
                              : "border-border bg-surface hover:border-dim"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex w-10 h-10 rounded-sm items-center justify-center bg-acid/20">
                              <Icon className="w-5 h-5 text-acid" />
                            </div>
                            <span className="font-medium text-text">{option.label}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-acid rounded-full flex items-center justify-center">
                              <span className="text-void text-xs">✓</span>
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
                              ? "border-acid bg-acid/10 ring-2 ring-acid/20"
                              : "border-border bg-surface hover:border-dim"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? "text-acid" : "text-dim"}`} />
                          <span className={`text-xs block ${isSelected ? "text-text font-medium" : "text-dim"}`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-acid rounded-full flex items-center justify-center">
                              <span className="text-void text-[10px]">✓</span>
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
                              ? "border-acid bg-acid/10 ring-2 ring-acid/20"
                              : "border-border bg-surface hover:border-dim"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? "text-acid" : "text-dim"}`} />
                          <span className={`text-xs block ${isSelected ? "text-text font-medium" : "text-dim"}`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-acid rounded-full flex items-center justify-center">
                              <span className="text-void text-[10px]">✓</span>
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
                    onClick={() => setStep(3)} 
                    className="group flex-1 inline-flex items-center gap-3"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="target_protein" className="text-sm font-medium text-text font-mono mb-2 block">
                    Target Protein (g/day, optional)
                  </Label>
                  <Input
                    id="target_protein"
                    type="number"
                    {...register("target_protein", { valueAsNumber: true })}
                    placeholder="e.g., 150"
                  />
                  <p className="text-sm text-dim mt-2 font-mono flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-acid" />
                    <span>A common goal is 1.6-2.2g per kg of body weight</span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="target_calories" className="text-sm font-medium text-text font-mono mb-2 block">
                    Target Calories (kcal/day, optional)
                  </Label>
                  <Input
                    id="target_calories"
                    type="number"
                    {...register("target_calories", { valueAsNumber: true })}
                    placeholder="e.g., 2000"
                  />
                  <p className="text-sm text-dim mt-2 font-mono flex items-center gap-2">
                    <Zap className="w-4 h-4 text-acid" />
                    <span>We'll calculate this based on your goals if you skip</span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="water_goal" className="text-sm font-medium text-text font-mono mb-2 block">
                    Daily Water Goal (ml, optional)
                  </Label>
                  <Input
                    id="water_goal"
                    type="number"
                    {...register("water_goal", { valueAsNumber: true })}
                    placeholder="e.g., 2000"
                  />
                  <p className="text-sm text-dim mt-2 font-mono flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-acid" />
                    <span>Default: 2000ml (8 cups). Adjust based on your activity level</span>
                  </p>
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
                    className="group flex-1 inline-flex items-center gap-3"
                  >
                    <span>{isSubmitting ? "Creating..." : "Complete Setup"}</span>
                    {!isSubmitting && (
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

