# Reset Onboarding for Specific User (Without Losing Data)

## ✅ Recommended Method: Use onboarding_completed Flag

**This preserves ALL user data** (meals, workouts, weight logs, etc.) and only triggers onboarding:

```sql
-- Replace USER_ID_HERE with the actual user ID
UPDATE user_profiles 
SET onboarding_completed = false
WHERE id = 'USER_ID_HERE';
```

### Example:
```sql
-- Reset onboarding for user with ID '90f5d171-fc96-4d58-b42a-d49e08d948a6'
UPDATE user_profiles 
SET onboarding_completed = false 
WHERE id = '90f5d171-fc96-4d58-b42a-d49e08d948a6';
```

**Benefits:**
- ✅ Preserves ALL data (meals, workouts, weight logs, achievements, etc.)
- ✅ User sees onboarding on next login
- ✅ After completing onboarding, flag automatically set to `true`
- ✅ No data loss whatsoever

## Alternative: Clear Only Onboarding Fields (Keeps Other Data)

If you want to reset onboarding fields AND trigger onboarding:

```sql
UPDATE user_profiles 
SET 
  name = NULL,
  age = NULL,
  weight = NULL,
  height = NULL,
  goal = NULL,
  goals = NULL,
  target_weight = NULL,
  timeframe_months = NULL,
  dietary_preference = NULL,
  activity_level = NULL,
  gender = NULL,
  calorie_target = NULL,
  protein_target = NULL,
  water_goal = NULL,
  onboarding_completed = false
WHERE id = 'USER_ID_HERE';
```

## ⚠️ Not Recommended: Delete Profile

```sql
-- This WILL DELETE profile data (but keeps meals/workouts)
DELETE FROM user_profiles WHERE id = 'USER_ID_HERE';
```

## How to Find User ID

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user by email
3. Copy their User UUID
4. Use that UUID in the SQL query above

## After Running

1. User needs to **log out** (if currently logged in)
2. User needs to **log back in**
3. Onboarding dialog will appear with all new features:
   - Multi-goal selection (10 goal types)
   - Target weight and timeframe fields
   - Updated personalized targets calculation

## Notes

- ⚠️ **Deleting profile** will remove all profile data but keep meal logs, workouts, etc.
- ⚠️ **Clearing fields** keeps the profile record but resets onboarding data
- ✅ User can complete onboarding again with new features
- ✅ All existing meal/workout data will be preserved

