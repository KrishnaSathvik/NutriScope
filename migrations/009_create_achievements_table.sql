-- ============================================================================
-- CREATE ACHIEVEMENTS TABLE
-- Stores user achievements and progress tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('streak', 'goal', 'milestone', 'special')),
  achievement_key TEXT NOT NULL, -- Unique identifier for the achievement
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name or emoji
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INTEGER DEFAULT 100 CHECK (progress >= 0 AND progress <= 100), -- 0-100, for progress tracking
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data
  UNIQUE (user_id, achievement_key)
);

-- Indexes for achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user_key ON achievements(user_id, achievement_key);

-- RLS Policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own achievements" ON achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON achievements;
DROP POLICY IF EXISTS "Users can delete own achievements" ON achievements;

CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own achievements"
  ON achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at (if needed in future)
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE achievements IS 'Stores user achievements and progress tracking';
COMMENT ON COLUMN achievements.achievement_key IS 'Unique identifier for the achievement (e.g., streak_7, milestone_first_meal)';
COMMENT ON COLUMN achievements.achievement_type IS 'Type of achievement: streak, goal, milestone, or special';
COMMENT ON COLUMN achievements.progress IS 'Progress percentage (0-100) for tracking achievement completion';

