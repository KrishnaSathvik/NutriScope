-- ============================================================================
-- Migration 029: Add RLS Policies for user_streaks table
-- Fixes security issue - table was showing as UNRESTRICTED
-- ============================================================================

-- Enable RLS on user_streaks table
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case of re-run)
DROP POLICY IF EXISTS "Users can view their own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can insert their own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can update their own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can delete their own streaks" ON user_streaks;

-- Users can view their own streaks
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own streaks
CREATE POLICY "Users can insert their own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own streaks
CREATE POLICY "Users can update their own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own streaks
CREATE POLICY "Users can delete their own streaks"
  ON user_streaks FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_streaks IS 'Stores computed streak data for users. RLS enabled - users can only access their own streak data.';

