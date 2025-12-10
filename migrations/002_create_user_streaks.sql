-- ============================================================================
-- MIGRATION 002: Create user_streaks table
-- Phase 2: Streak Data Migration
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_log_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_last_log_date ON user_streaks(last_log_date);

-- Add comment
COMMENT ON TABLE user_streaks IS 'Stores computed streak data for users to avoid recalculation on every page load';

