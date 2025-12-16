# Weight Tracking Setup Guide

## 🎯 What Was Implemented

Weight tracking with body composition trends has been fully implemented! Users can now:
- Log weight entries (daily/weekly)
- Track body composition (body fat %, muscle mass)
- View weight trends over time
- See BMI calculations automatically
- Monitor progress toward weight goals

## 📋 Setup Steps

### Step 1: Run Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Run `weight_tracking_schema.sql`
   - Creates `weight_logs` table
   - Sets up indexes and RLS policies
   - Creates helper functions (BMI calculation, weight change, etc.)

### Step 2: Verify Setup

1. Check that `weight_logs` table exists
2. Verify RLS policies are active
3. Test BMI function: `SELECT calculate_bmi(70, 175);` (should return ~22.9)

## 🎨 How It Works

### User Flow:
1. User opens Profile page
2. Scrolls to "Weight Tracking" section
3. Clicks "Log Weight" button
4. Enters:
   - Weight (kg) - required
   - Date - defaults to today
   - Body fat % - optional
   - Muscle mass - optional
   - Notes - optional
5. App calculates BMI automatically
6. Weight logged!
7. View trends chart showing weight over time

### Example:
```
User logs:
- Weight: 75kg
- Height: 175cm (from profile)
- Date: Today

App calculates:
- BMI: 24.5 (Normal weight)
- Shows on chart
- Tracks trend over time
```

## 📁 Files Created

1. **`weight_tracking_schema.sql`** - Database schema
2. **`src/services/weightTracking.ts`** - Service functions
3. **`src/components/WeightEntry.tsx`** - Weight entry form
4. **`src/components/WeightChart.tsx`** - Weight trend chart
5. **`src/pages/ProfilePage.tsx`** - Updated with weight tracking section

## 🔧 Features

### Weight Tracking Service (`weightTracking.ts`)
- `createWeightLog(entry)` - Log weight entry
- `updateWeightLog(id, updates)` - Update entry
- `deleteWeightLog(id)` - Delete entry
- `getWeightLogs(startDate, endDate)` - Get logs for date range
- `getLatestWeight()` - Get most recent weight
- `getWeightChange(daysBack)` - Calculate weight change
- `getWeightStats(daysBack)` - Get statistics
- `calculateBMI(weight, height)` - Calculate BMI
- `getBMICategory(bmi)` - Get BMI category
- `getBMICategoryInfo(bmi)` - Get BMI info with colors

### Weight Entry Component
- Date picker (defaults to today)
- Weight input (kg)
- Optional: Body fat %, Muscle mass
- Notes field
- Form validation

### Weight Chart Component
- Line chart showing weight over time
- Summary stats (current, change, BMI, target)
- Goal line overlay (if target weight set)
- Configurable time range (default 30 days)
- BMI display option
- Mobile responsive

### Profile Page Integration
- Weight Tracking section
- Quick "Log Weight" button
- Shows latest weight and BMI
- Displays weight trend chart
- 30-day view by default

## 📊 BMI Categories

- **Underweight**: BMI < 18.5 (Blue)
- **Normal**: BMI 18.5 - 24.9 (Green)
- **Overweight**: BMI 25 - 29.9 (Yellow)
- **Obese**: BMI ≥ 30 (Red)

## 🎯 Features

1. **Weight Logging**: Daily/weekly entries
2. **BMI Calculation**: Automatic based on height from profile
3. **Trend Visualization**: Chart showing weight over time
4. **Progress Tracking**: Weight change over periods
5. **Goal Comparison**: Shows progress toward target weight
6. **Body Composition**: Optional body fat % and muscle mass tracking
7. **Statistics**: Current, change, average, min, max

## 🔍 Testing

1. Open Profile page
2. Scroll to "Weight Tracking" section
3. Click "Log Weight"
4. Enter weight: 75kg
5. Verify BMI calculates automatically
6. Submit
7. View chart showing weight trend
8. Log another entry for a different date
9. See trend line update

## 🐛 Troubleshooting

### BMI not calculating?
- Check user has height in profile
- Verify height is in cm
- Check BMI calculation function exists

### Chart not showing?
- Verify weight logs exist
- Check date range
- Verify RLS policies allow SELECT

### Weight not saving?
- Check RLS policies allow INSERT
- Verify user is authenticated
- Check network tab for errors

## 📝 Notes

- Weight stored in kg (convert from lbs if needed)
- BMI calculated using: weight (kg) / height (m)²
- Target weight calculated based on BMI of 22 (for weight loss goals)
- Chart shows last 30 days by default
- Body fat % and muscle mass are optional

## 🚀 Next Steps

Consider adding:
- Weight goal setting in profile
- Weekly/monthly summaries
- Weight reminders
- Export weight data
- Correlation with calories/exercise
- Photo progress tracking
- Body measurements (waist, hips, etc.)

