-- ============================================================================
-- MIGRATION 001: Add preferences column to user_profiles
-- Phase 1: User Preferences Migration
-- ============================================================================

-- Add preferences JSONB column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences 
ON user_profiles USING GIN (preferences);

-- Add comment
COMMENT ON COLUMN user_profiles.preferences IS 'User preferences stored as JSONB: { notificationDialogDismissed?: boolean, theme?: "light" | "dark" | "system" }';

