-- ============================================================================
-- RESET ONBOARDING FOR SPECIFIC USER (WITHOUT LOSING DATA)
-- This script resets onboarding for a specific user WITHOUT deleting any data
-- Run this in Supabase SQL Editor, replacing USER_ID_HERE with the actual user ID
-- ============================================================================

-- RECOMMENDED: Set onboarding_completed to false (preserves all data)
-- Replace 'USER_ID_HERE' with the actual user ID
UPDATE user_profiles 
SET onboarding_completed = false
WHERE id = 'USER_ID_HERE';

-- Example usage:
-- To reset onboarding for user with ID '2810667e-1d13-498d-8935-7b89b6e55ff2':
-- UPDATE user_profiles SET onboarding_completed = false WHERE id = '2810667e-1d13-498d-8935-7b89b6e55ff2';

-- Note: 
-- - This preserves ALL user data (meals, workouts, weight logs, etc.)
-- - User will see onboarding dialog on next login
-- - After completing onboarding, the flag will be set back to true automatically
-- - All existing data remains intact

-- ============================================================================
-- ALTERNATIVE OPTIONS (if you need more control):
-- ============================================================================

-- Option 2: Clear only onboarding-related fields (keeps other data)
-- UPDATE user_profiles 
-- SET 
--   name = NULL,
--   age = NULL,
--   weight = NULL,
--   height = NULL,
--   goal = NULL,
--   goals = NULL,
--   target_weight = NULL,
--   timeframe_months = NULL,
--   dietary_preference = NULL,
--   activity_level = NULL,
--   gender = NULL,
--   calorie_target = NULL,
--   protein_target = NULL,
--   water_goal = NULL,
--   onboarding_completed = false
-- WHERE id = 'USER_ID_HERE';

-- Option 3: Delete the entire profile (WILL LOSE PROFILE DATA - not recommended)
-- DELETE FROM user_profiles WHERE id = 'USER_ID_HERE';

