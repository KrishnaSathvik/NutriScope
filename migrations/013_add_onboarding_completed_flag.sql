-- ============================================================================
-- ADD ONBOARDING_COMPLETED FLAG
-- This allows triggering onboarding without deleting user data
-- ============================================================================

-- Add onboarding_completed flag (defaults to true for existing users, false for new)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT true;

-- Set all existing profiles as having completed onboarding
UPDATE user_profiles 
SET onboarding_completed = true 
WHERE onboarding_completed IS NULL;

-- Add comment
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Flag to indicate if user has completed onboarding. Set to false to trigger onboarding again.';

