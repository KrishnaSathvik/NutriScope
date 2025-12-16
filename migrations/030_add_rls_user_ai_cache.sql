-- ============================================================================
-- Migration 030: Add RLS Policies for user_ai_cache table
-- Fixes security issue - table was showing as UNRESTRICTED
-- ============================================================================

-- Enable RLS on user_ai_cache table
ALTER TABLE user_ai_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case of re-run)
DROP POLICY IF EXISTS "Users can view their own AI cache" ON user_ai_cache;
DROP POLICY IF EXISTS "Users can insert their own AI cache" ON user_ai_cache;
DROP POLICY IF EXISTS "Users can update their own AI cache" ON user_ai_cache;
DROP POLICY IF EXISTS "Users can delete their own AI cache" ON user_ai_cache;

-- Users can view their own AI cache entries
CREATE POLICY "Users can view their own AI cache"
  ON user_ai_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own AI cache entries
CREATE POLICY "Users can insert their own AI cache"
  ON user_ai_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own AI cache entries
CREATE POLICY "Users can update their own AI cache"
  ON user_ai_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own AI cache entries
CREATE POLICY "Users can delete their own AI cache"
  ON user_ai_cache FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_ai_cache IS 'Stores AI-generated content (coach tips, daily insights) for cross-device sync and cache. RLS enabled - users can only access their own cache entries.';

