# Exercise Library with METs - Complete Guide

## 🏋️ What is METs?

**METs** stands for **Metabolic Equivalent of Task**. It's a standardized way to measure the intensity of physical activities.

### **Simple Explanation:**
- **1 MET** = Resting metabolic rate (sitting quietly)
- **3 METs** = 3x more energy than resting (moderate walking)
- **8 METs** = 8x more energy than resting (running)
- **12 METs** = 12x more energy than resting (sprinting)

### **Why METs Matter:**
METs allow us to **calculate calories burned** accurately using this formula:

```
Calories Burned = METs × Weight (kg) × Duration (hours)
```

---

## 📚 What is an Exercise Library?

An **Exercise Library** is a database of exercises with:
- Exercise names
- MET values
- Exercise types (cardio, strength, yoga, etc.)
- Muscle groups worked
- Equipment needed
- Instructions/videos

### **Example Exercise Entry:**
```json
{
  "name": "Running, 8 mph (7.5 min/mile)",
  "type": "cardio",
  "met_value": 11.5,
  "muscle_groups": ["legs", "core", "cardiovascular"],
  "equipment": [],
  "instructions": "Maintain steady pace..."
}
```

---

## 🎯 How It Works

### **Current Problem:**
Users manually enter calories burned, which is often inaccurate:
```
User: "I ran for 30 minutes"
User guesses: "300 calories burned" ❌ (probably wrong)
```

### **With METs Library:**
```
User: "I ran for 30 minutes"
App looks up: "Running, 8 mph" = 11.5 METs
User weight: 70kg
App calculates: 11.5 × 70kg × 0.5 hours = 402 calories ✅
```

---

## 💻 How It Works Technically

### **Step 1: User Selects Exercise**
```
User opens workout form
↓
Clicks "Select Exercise"
↓
Exercise library opens
↓
User searches/browses exercises
↓
Selects "Running, 8 mph"
```

### **Step 2: App Auto-Fills Data**
```
Exercise selected: "Running, 8 mph"
↓
METs value: 11.5 (from library)
↓
User enters: Duration = 30 minutes
↓
App calculates: Calories = 11.5 × 70kg × 0.5h = 402 cal
↓
Form auto-fills calories burned!
```

### **Step 3: User Confirms**
```
User reviews:
- Exercise: Running, 8 mph
- Duration: 30 minutes
- Calories: 402 (auto-calculated)
↓
User confirms → Workout logged!
```

---

## 📊 Real-World Example

### **Scenario: User logs a workout**

**Without Exercise Library:**
```
User: "I did push-ups"
User guesses: "50 calories" ❌ (probably wrong)
```

**With Exercise Library:**
```
User selects: "Push-ups, moderate effort"
Library provides: METs = 3.8
User weight: 70kg
Duration: 10 minutes
↓
Calculation: 3.8 × 70kg × (10/60) hours = 44 calories ✅
```

### **More Examples:**

| Exercise | METs | Weight | Duration | Calories Burned |
|----------|------|--------|----------|-----------------|
| Walking, 3 mph | 3.5 | 70kg | 30 min | 122 cal |
| Running, 6 mph | 9.8 | 70kg | 30 min | 343 cal |
| Cycling, moderate | 6.0 | 70kg | 30 min | 210 cal |
| Push-ups | 3.8 | 70kg | 10 min | 44 cal |
| Squats | 5.0 | 70kg | 15 min | 88 cal |
| Yoga, Hatha | 2.5 | 70kg | 60 min | 175 cal |

---

## 🔧 Technical Implementation

### **1. Database Schema**

```sql
-- Exercise Library Table
CREATE TABLE exercise_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cardio', 'strength', 'yoga', 'sports', 'other')),
  met_value DECIMAL(4,2) NOT NULL, -- e.g., 8.5
  muscle_groups TEXT[], -- ['chest', 'triceps', 'shoulders']
  equipment TEXT[], -- ['dumbbells', 'barbell', 'none']
  instructions TEXT,
  video_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast searches
CREATE INDEX idx_exercise_library_name ON exercise_library(name);
CREATE INDEX idx_exercise_library_type ON exercise_library(type);
CREATE INDEX idx_exercise_library_muscle_groups ON exercise_library USING GIN(muscle_groups);
```

### **2. Sample Exercise Data**

```sql
-- Insert common exercises
INSERT INTO exercise_library (name, type, met_value, muscle_groups, equipment) VALUES
-- Cardio
('Walking, 3 mph (20 min/mile)', 'cardio', 3.5, ARRAY['legs', 'cardiovascular'], ARRAY[]),
('Walking, 4 mph (15 min/mile)', 'cardio', 4.3, ARRAY['legs', 'cardiovascular'], ARRAY[]),
('Running, 5 mph (12 min/mile)', 'cardio', 8.3, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]),
('Running, 6 mph (10 min/mile)', 'cardio', 9.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]),
('Running, 8 mph (7.5 min/mile)', 'cardio', 11.5, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]),
('Cycling, moderate effort', 'cardio', 6.0, ARRAY['legs', 'cardiovascular'], ARRAY['bicycle']),
('Cycling, vigorous effort', 'cardio', 10.0, ARRAY['legs', 'cardiovascular'], ARRAY['bicycle']),
('Swimming, freestyle, moderate', 'cardio', 8.3, ARRAY['full body', 'cardiovascular'], ARRAY[]),
('Jumping rope, moderate', 'cardio', 11.0, ARRAY['legs', 'core', 'cardiovascular'], ARRAY['rope']),

-- Strength
('Push-ups, moderate effort', 'strength', 3.8, ARRAY['chest', 'triceps', 'shoulders'], ARRAY[]),
('Pull-ups', 'strength', 8.0, ARRAY['back', 'biceps'], ARRAY['pull-up bar']),
('Squats', 'strength', 5.0, ARRAY['legs', 'glutes'], ARRAY[]),
('Deadlifts', 'strength', 6.0, ARRAY['back', 'legs', 'glutes'], ARRAY['barbell']),
('Bench press', 'strength', 5.0, ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench']),
('Bicep curls', 'strength', 3.0, ARRAY['biceps'], ARRAY['dumbbells']),
('Shoulder press', 'strength', 4.0, ARRAY['shoulders', 'triceps'], ARRAY['dumbbells']),

-- Yoga
('Yoga, Hatha', 'yoga', 2.5, ARRAY['full body', 'flexibility'], ARRAY['mat']),
('Yoga, Vinyasa', 'yoga', 4.0, ARRAY['full body', 'flexibility'], ARRAY['mat']),
('Yoga, Power', 'yoga', 4.0, ARRAY['full body', 'strength'], ARRAY['mat']),

-- Sports
('Basketball, general', 'sports', 8.0, ARRAY['full body'], ARRAY[]),
('Soccer, general', 'sports', 7.0, ARRAY['legs', 'cardiovascular'], ARRAY[]),
('Tennis, singles', 'sports', 8.0, ARRAY['full body'], ARRAY['racket']),
('Volleyball, competitive', 'sports', 8.0, ARRAY['full body'], ARRAY[]);
```

### **3. Service to Calculate Calories**

```typescript
// src/services/exerciseLibrary.ts
import { supabase } from '@/lib/supabase'

export interface Exercise {
  id: string
  name: string
  type: 'cardio' | 'strength' | 'yoga' | 'sports' | 'other'
  met_value: number
  muscle_groups: string[]
  equipment: string[]
  instructions?: string
  video_url?: string
}

/**
 * Search exercises in library
 */
export async function searchExercises(query: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(20)

  if (error) throw error
  return data || []
}

/**
 * Get exercise by ID
 */
export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .eq('id', exerciseId)
    .single()

  if (error) return null
  return data
}

/**
 * Calculate calories burned using METs formula
 * Formula: Calories = METs × Weight (kg) × Duration (hours)
 */
export function calculateCaloriesBurned(
  metValue: number,
  weightKg: number,
  durationMinutes: number
): number {
  const durationHours = durationMinutes / 60
  return Math.round(metValue * weightKg * durationHours)
}

/**
 * Get exercises by type
 */
export async function getExercisesByType(
  type: Exercise['type']
): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .eq('type', type)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Get exercises by muscle group
 */
export async function getExercisesByMuscleGroup(
  muscleGroup: string
): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .contains('muscle_groups', [muscleGroup])
    .order('name')

  if (error) throw error
  return data || []
}
```

### **4. Exercise Selector Component**

```typescript
// src/components/ExerciseSelector.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchExercises, Exercise, calculateCaloriesBurned } from '@/services/exerciseLibrary'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Dumbbell, Activity, Heart, Target } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ExerciseSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (exercise: Exercise, calories: number) => void
  durationMinutes: number // Duration user entered
}

export function ExerciseSelector({ 
  open, 
  onClose, 
  onSelect, 
  durationMinutes 
}: ExerciseSelectorProps) {
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', searchQuery, selectedType],
    queryFn: async () => {
      if (searchQuery) {
        return searchExercises(searchQuery)
      }
      // Return all exercises or filter by type
      return []
    },
    enabled: open,
  })

  const userWeight = profile?.weight || 70 // Default to 70kg if not set
  const exerciseTypes = [
    { value: 'all', label: 'All', icon: Activity },
    { value: 'cardio', label: 'Cardio', icon: Heart },
    { value: 'strength', label: 'Strength', icon: Dumbbell },
    { value: 'yoga', label: 'Yoga', icon: Target },
    { value: 'sports', label: 'Sports', icon: Activity },
  ]

  const handleSelect = (exercise: Exercise) => {
    const calories = calculateCaloriesBurned(
      exercise.met_value,
      userWeight,
      durationMinutes
    )
    onSelect(exercise, calories)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Exercise</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-modern pl-10 w-full"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {exerciseTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-colors whitespace-nowrap ${
                selectedType === value
                  ? 'border-acid bg-acid/10 text-acid'
                  : 'border-border bg-panel text-dim hover:text-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-mono">{label}</span>
            </button>
          ))}
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-dim font-mono text-sm">Loading...</div>
          ) : exercises && exercises.length > 0 ? (
            exercises.map((exercise) => {
              const calories = calculateCaloriesBurned(
                exercise.met_value,
                userWeight,
                durationMinutes
              )
              
              return (
                <button
                  key={exercise.id}
                  onClick={() => handleSelect(exercise)}
                  className="w-full text-left p-4 border border-border rounded-sm bg-panel hover:border-acid hover:bg-acid/5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text font-mono mb-1">{exercise.name}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-dim font-mono">
                        <span className="bg-surface px-2 py-0.5 rounded">{exercise.type}</span>
                        <span>METs: {exercise.met_value}</span>
                        {exercise.muscle_groups.length > 0 && (
                          <span>{exercise.muscle_groups.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-acid font-mono">
                        {calories}
                      </div>
                      <div className="text-xs text-dim font-mono">calories</div>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="text-center py-8 text-dim font-mono text-sm">
              {searchQuery ? 'No exercises found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### **5. Integration into Workouts Page**

```typescript
// Add to WorkoutsPage.tsx
import { ExerciseSelector } from '@/components/ExerciseSelector'
import { Exercise } from '@/services/exerciseLibrary'
import { Search } from 'lucide-react'

export default function WorkoutsPage() {
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(30)

  const handleExerciseSelect = (exercise: Exercise, calories: number) => {
    setSelectedExercise(exercise)
    // Auto-fill form with exercise data
    setFormData({
      name: exercise.name,
      type: exercise.type,
      duration: durationMinutes,
      calories_burned: calories, // Auto-calculated!
      exercises: [{
        name: exercise.name,
        type: exercise.type,
        duration: durationMinutes,
        calories_burned: calories,
      }]
    })
  }

  return (
    <>
      {/* Add Exercise Selector Button */}
      <button
        onClick={() => setShowExerciseSelector(true)}
        className="btn-secondary flex items-center gap-2"
      >
        <Search className="w-4 h-4" />
        <span>Browse Exercises</span>
      </button>

      {/* Exercise Selector Dialog */}
      <ExerciseSelector
        open={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        onSelect={handleExerciseSelect}
        durationMinutes={durationMinutes}
      />
    </>
  )
}
```

---

## 📊 METs Reference Table

### **Common Activities:**

| Activity | METs | Intensity |
|----------|------|-----------|
| Sleeping | 0.9 | Very Light |
| Watching TV | 1.0 | Light |
| Walking, slow | 2.5 | Light |
| Walking, moderate | 3.5 | Moderate |
| Bicycling, leisure | 4.0 | Moderate |
| Dancing | 4.8 | Moderate |
| Tennis, doubles | 5.0 | Moderate |
| Running, 5 mph | 8.3 | Vigorous |
| Running, 8 mph | 11.5 | Very Vigorous |
| Running, 10 mph | 16.0 | Very Vigorous |

---

## ✅ Benefits

1. **Accuracy**: Calculates calories based on science, not guesswork
2. **Consistency**: Same exercise = same calculation every time
3. **Education**: Users learn about exercise intensity
4. **Speed**: Faster than manual entry
5. **Completeness**: Includes exercise details (muscle groups, equipment)

---

## 🎯 User Experience Flow

```
1. User opens workout form
   ↓
2. User enters duration: "30 minutes"
   ↓
3. User clicks "Browse Exercises"
   ↓
4. Exercise library opens
   ↓
5. User searches: "running"
   ↓
6. Sees list:
   - Running, 5 mph (8.3 METs) → 290 cal
   - Running, 6 mph (9.8 METs) → 343 cal
   - Running, 8 mph (11.5 METs) → 402 cal
   ↓
7. User selects: "Running, 8 mph"
   ↓
8. Form auto-fills:
   - Exercise: "Running, 8 mph"
   - Duration: 30 minutes
   - Calories: 402 (auto-calculated!)
   ↓
9. User confirms → Workout logged!
```

---

## 📝 Summary

**Exercise Library with METs** = A database of exercises with their MET values that automatically calculates calories burned based on:
- Exercise intensity (METs)
- User's weight
- Duration of exercise

**Key Formula:**
```
Calories = METs × Weight (kg) × Duration (hours)
```

This makes workout logging:
- ✅ More accurate
- ✅ Faster
- ✅ Educational
- ✅ Consistent

The library includes hundreds of exercises with their MET values, so users can quickly find and log any exercise with accurate calorie calculations!

