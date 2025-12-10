-- ============================================================================
-- MIGRATION 003: Create user_ai_cache table
-- Phase 3: AI Cache Migration
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_ai_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('coach_tip', 'daily_insight')),
  date DATE NOT NULL,
  tip_index INTEGER, -- NULL for daily_insight, 0-2 for coach_tip
  content TEXT NOT NULL,
  data_signature TEXT, -- For daily_insight cache validation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint using a unique index that handles NULLs properly
-- For coach_tip: unique on (user_id, cache_type, date, tip_index)
-- For daily_insight: unique on (user_id, cache_type, date) where tip_index is NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_cache_unique_coach_tip
ON user_ai_cache(user_id, cache_type, date, tip_index)
WHERE tip_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_cache_unique_daily_insight
ON user_ai_cache(user_id, cache_type, date)
WHERE tip_index IS NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_ai_cache_user_date 
ON user_ai_cache(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_ai_cache_type 
ON user_ai_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_user_ai_cache_user_type_date 
ON user_ai_cache(user_id, cache_type, date DESC);

-- Add comment
COMMENT ON TABLE user_ai_cache IS 'Stores AI-generated content (coach tips, daily insights) for cross-device sync and cache';

