# Exercise Library Setup Guide

## 🎯 What Was Implemented

The Exercise Library with METs feature has been fully implemented! This allows users to:
- Browse/search exercises from a comprehensive library
- Auto-calculate calories burned using METs formula
- Quickly log workouts with accurate data

## 📋 Setup Steps

### Step 1: Run Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Run `exercise_library_schema.sql`
   - Creates `exercise_library` table
   - Sets up indexes and RLS policies
   - Creates helper function for calorie calculation

### Step 2: Populate Exercise Data

1. In the same SQL Editor, run `exercise_library_data.sql`
   - Inserts 150+ exercises with MET values
   - Includes cardio, strength, yoga, sports, and other types
   - All exercises have accurate MET values

### Step 3: Verify Setup

1. Check that `exercise_library` table exists
2. Verify you have exercises: `SELECT COUNT(*) FROM exercise_library;`
3. Test a search: `SELECT * FROM exercise_library WHERE name ILIKE '%running%';`

## 🎨 How It Works

### User Flow:
1. User opens Workouts page
2. Clicks "Log Workout" button
3. Enters duration (e.g., 30 minutes)
4. Clicks "Browse" button next to Exercise Name field
5. Exercise Library opens with search/categories
6. User searches or browses exercises
7. Selects exercise (e.g., "Running, 8 mph")
8. **Calories auto-calculate** based on:
   - Exercise METs value (11.5)
   - User's weight (from profile)
   - Duration entered
9. Form auto-fills with exercise data
10. User confirms → Workout logged!

### Example Calculation:
```
Exercise: Running, 8 mph
METs: 11.5
User Weight: 70kg
Duration: 30 minutes

Calories = 11.5 × 70kg × (30/60) hours
Calories = 11.5 × 70 × 0.5
Calories = 402 calories ✅
```

## 📁 Files Created

1. **`exercise_library_schema.sql`** - Database schema
2. **`exercise_library_data.sql`** - Sample exercise data
3. **`src/services/exerciseLibrary.ts`** - Service functions
4. **`src/components/ExerciseSelector.tsx`** - UI component
5. **`src/pages/WorkoutsPage.tsx`** - Updated with integration

## 🔧 Features

### Exercise Library Service (`exerciseLibrary.ts`)
- `searchExercises(query)` - Search exercises by name
- `getExercisesByType(type)` - Filter by type (cardio, strength, etc.)
- `getExercisesByMuscleGroup(group)` - Filter by muscle group
- `calculateCaloriesBurned(met, weight, duration)` - Calculate calories
- `getExercise(id)` - Get single exercise

### Exercise Selector Component
- Search functionality
- Category filters (All, Cardio, Strength, Yoga, Sports, Other)
- Real-time calorie calculation preview
- Shows METs value, muscle groups, equipment
- Mobile responsive

### Integration
- "Browse" button next to Exercise Name field
- Auto-fills form when exercise selected
- Uses user's weight from profile
- Respects duration entered by user

## 🎯 Benefits

1. **Accuracy**: Science-based calorie calculations
2. **Speed**: Faster than manual entry
3. **Consistency**: Same exercise = same calculation
4. **Education**: Users learn about exercise intensity
5. **Completeness**: Includes exercise details

## 📊 Exercise Categories

- **Cardio**: Running, Walking, Cycling, Swimming, etc.
- **Strength**: Push-ups, Squats, Deadlifts, etc.
- **Yoga**: Hatha, Vinyasa, Power, etc.
- **Sports**: Basketball, Soccer, Tennis, etc.
- **Other**: Rock climbing, Hiking, etc.

## 🔍 Testing

1. Open Workouts page
2. Click "Log Workout"
3. Enter duration: 30
4. Click "Browse" button
5. Search for "running"
6. Select "Running, 8 mph"
7. Verify calories auto-calculate
8. Verify form auto-fills
9. Submit workout

## 🐛 Troubleshooting

### No exercises showing?
- Check if `exercise_library` table exists
- Verify data was inserted: `SELECT COUNT(*) FROM exercise_library;`
- Check RLS policies allow SELECT

### Calories not calculating?
- Verify user has weight in profile
- Check duration is entered
- Verify METs value exists for exercise

### Search not working?
- Check network tab for API errors
- Verify Supabase connection
- Check RLS policies

## 📝 Notes

- Default weight is 70kg if user hasn't set weight in profile
- Duration must be entered before browsing exercises
- Sample exercises included for development (works without database)
- All exercises use standard METs values from research

## 🚀 Next Steps

Consider adding:
- Exercise favorites/bookmarks
- Recent exercises
- Exercise instructions/videos
- Custom exercises
- Exercise history tracking

