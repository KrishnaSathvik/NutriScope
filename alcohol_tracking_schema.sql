-- Alcohol Tracking Schema
-- Run this in your Supabase SQL Editor

-- Alcohol Logs Table
CREATE TABLE IF NOT EXISTS alcohol_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  drink_type TEXT NOT NULL, -- 'beer', 'wine', 'spirits', 'cocktail', 'other'
  drink_name TEXT, -- e.g., "Red Wine", "IPA Beer", "Whiskey"
  amount DECIMAL(5,2) NOT NULL, -- in standard drinks (1 drink = 14g pure alcohol)
  alcohol_content DECIMAL(4,2), -- percentage (e.g., 5.0 for beer, 12.0 for wine)
  calories INTEGER DEFAULT 0, -- estimated calories
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alcohol_logs_user_date ON alcohol_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_alcohol_logs_date ON alcohol_logs(date DESC);

-- Row Level Security (RLS)
ALTER TABLE alcohol_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can only see their own alcohol logs
CREATE POLICY "Users can view their own alcohol logs"
  ON alcohol_logs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert their own alcohol logs
CREATE POLICY "Users can insert their own alcohol logs"
  ON alcohol_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own alcohol logs
CREATE POLICY "Users can update their own alcohol logs"
  ON alcohol_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own alcohol logs
CREATE POLICY "Users can delete their own alcohol logs"
  ON alcohol_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Add alcohol tracking to daily_logs table (optional - can calculate on the fly)
-- We'll add this column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_logs' AND column_name = 'alcohol_drinks'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN alcohol_drinks DECIMAL(5,2) DEFAULT 0;
  END IF;
END $$;

-- Function to calculate standard drinks
-- 1 standard drink = 14g pure alcohol
-- Formula: (volume_ml * alcohol_content%) / 14
CREATE OR REPLACE FUNCTION calculate_standard_drinks(
  volume_ml DECIMAL,
  alcohol_percent DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((volume_ml * alcohol_percent / 100) / 14, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

