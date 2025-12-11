-- ============================================================================
-- RESET ONBOARDING FOR KRISHNA (User ID: 2810667e-1d13-498d-8935-7b89b6e55ff2)
-- This will trigger onboarding without losing any data
-- ============================================================================

-- First, ensure onboarding_completed column exists (run migration 013 first if not done)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT true;

-- Reset onboarding for Krishna - preserves all data
UPDATE user_profiles 
SET onboarding_completed = false
WHERE id = '2810667e-1d13-498d-8935-7b89b6e55ff2';

-- Verify the update
SELECT id, email, name, onboarding_completed, goals, target_weight, timeframe_months
FROM user_profiles 
WHERE id = '2810667e-1d13-498d-8935-7b89b6e55ff2';

-- Note: After running this, Krishna will see onboarding on next login
-- All existing data (meals, workouts, etc.) will be preserved

