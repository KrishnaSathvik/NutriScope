-- ============================================================================
-- Migration 020: Create Sleep Tracking Tables
-- Creates sleep_logs table for tracking sleep duration and quality
-- ============================================================================

-- Sleep Logs Table
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bedtime TIME, -- When user went to bed
  wake_time TIME, -- When user woke up
  sleep_duration DECIMAL(4,2) NOT NULL, -- in hours (e.g., 7.5 for 7 hours 30 minutes)
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5), -- 1-5 scale (optional)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_date ON sleep_logs(date DESC);

-- Row Level Security (RLS)
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can only see their own sleep logs
CREATE POLICY "Users can view their own sleep logs"
  ON sleep_logs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert their own sleep logs
CREATE POLICY "Users can insert their own sleep logs"
  ON sleep_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own sleep logs
CREATE POLICY "Users can update their own sleep logs"
  ON sleep_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own sleep logs
CREATE POLICY "Users can delete their own sleep logs"
  ON sleep_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Add sleep tracking to daily_logs table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_logs' AND column_name = 'sleep_hours'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN sleep_hours DECIMAL(4,2) DEFAULT NULL;
  END IF;
END $$;

-- Function to calculate sleep duration from bedtime and wake_time
CREATE OR REPLACE FUNCTION calculate_sleep_duration(
  bedtime_time TIME,
  wake_time TIME
) RETURNS DECIMAL AS $$
DECLARE
  bedtime_ts TIMESTAMP;
  wake_ts TIMESTAMP;
  duration_hours DECIMAL;
BEGIN
  IF bedtime_time IS NULL OR wake_time IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert to timestamps for calculation (using a reference date)
  bedtime_ts := ('2000-01-01'::DATE + bedtime_time)::TIMESTAMP;
  wake_ts := ('2000-01-01'::DATE + wake_time)::TIMESTAMP;
  
  -- Handle case where wake_time is next day (after midnight)
  IF wake_ts < bedtime_ts THEN
    wake_ts := wake_ts + INTERVAL '1 day';
  END IF;
  
  duration_hours := EXTRACT(EPOCH FROM (wake_ts - bedtime_ts)) / 3600.0;
  
  RETURN ROUND(duration_hours, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger for updated_at
CREATE TRIGGER update_sleep_logs_updated_at
  BEFORE UPDATE ON sleep_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

