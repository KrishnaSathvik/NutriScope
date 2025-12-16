# Onboarding Fix - Complete Setup Issue

## Problem
Onboarding/complete setup was failing with 400 Bad Request error when trying to create user profile.

## Root Cause
The code was trying to send both `calorie_target`/`protein_target` AND `target_calories`/`target_protein` columns. If the production database only has `calorie_target` and `protein_target` (as per SCHEMA_FIXED.sql), sending `target_calories` and `target_protein` would cause a 400 error.

## Solution
Updated `OnboardingDialog.tsx` to:
1. **Only use `calorie_target` and `protein_target`** - These columns definitely exist
2. **Removed `target_calories` and `target_protein`** - These might not exist in production
3. **Added better error logging** - Shows detailed error information in console

## Changes Made

### Before:
```typescript
const profileData = {
  calorie_target: calorieTarget,
  target_calories: calorieTarget,  // ❌ Might not exist
  protein_target: proteinTarget,
  target_protein: proteinTarget,   // ❌ Might not exist
  // ...
}
```

### After:
```typescript
const profileData = {
  calorie_target: calorieTarget,  // ✅ Definitely exists
  protein_target: proteinTarget,   // ✅ Definitely exists
  // ...
}
```

## Testing
1. Try completing onboarding
2. Check browser console for any errors
3. Profile should be created successfully

## If Still Failing
Check browser console for the exact error message. The enhanced error logging will show:
- Error code
- Error message
- Error details
- Error hint
- Profile data that was attempted

This will help identify if there are other issues (RLS policies, missing columns, etc.).

