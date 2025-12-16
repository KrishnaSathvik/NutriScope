-- ============================================================================
-- Migration 018: Create Reminders Table
-- Stores scheduled reminders in Supabase for reliable triggering
-- ============================================================================

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY, -- Format: {type}-{userId} e.g., "water-d2a1008d-9ae4-4934-9d3b-e253115d8298"
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('meal', 'water', 'workout', 'goal', 'streak', 'weight', 'summary')),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('daily', 'weekly', 'recurring', 'smart')),
  
  -- Scheduling fields
  scheduled_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_trigger_time TIMESTAMPTZ NOT NULL,
  interval_minutes INTEGER, -- For recurring reminders
  days_of_week INTEGER[], -- For weekly reminders (0-6, Sunday-Saturday)
  start_time TEXT, -- HH:mm format for recurring reminders
  end_time TEXT, -- HH:mm format for recurring reminders
  
  -- Notification options
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  tag TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_next_trigger_time ON reminders(next_trigger_time);
CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled);
CREATE INDEX IF NOT EXISTS idx_reminders_user_enabled_trigger ON reminders(user_id, enabled, next_trigger_time);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own reminders
CREATE POLICY "Users can view their own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reminders
CREATE POLICY "Users can insert their own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update their own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminders_updated_at();

-- Function to get upcoming reminders (for service worker)
CREATE OR REPLACE FUNCTION get_upcoming_reminders(
  p_user_id UUID,
  p_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  user_id UUID,
  type TEXT,
  reminder_type TEXT,
  next_trigger_time TIMESTAMPTZ,
  title TEXT,
  body TEXT,
  tag TEXT,
  data JSONB,
  interval_minutes INTEGER,
  days_of_week INTEGER[],
  start_time TEXT,
  end_time TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.type,
    r.reminder_type,
    r.next_trigger_time,
    r.title,
    r.body,
    r.tag,
    r.data,
    r.interval_minutes,
    r.days_of_week,
    r.start_time,
    r.end_time
  FROM reminders r
  WHERE r.user_id = p_user_id
    AND r.enabled = true
    AND r.next_trigger_time <= NOW() + (p_window_minutes || ' minutes')::INTERVAL
    AND r.next_trigger_time >= NOW() - ('30 minutes')::INTERVAL -- Catch overdue reminders up to 30 minutes past
  ORDER BY r.next_trigger_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_upcoming_reminders(UUID, INTEGER) TO authenticated;

COMMENT ON TABLE reminders IS 'Stores scheduled reminders for users. Service worker reads from this table to trigger notifications.';
COMMENT ON COLUMN reminders.next_trigger_time IS 'Next time this reminder should trigger. Service worker checks reminders where next_trigger_time <= NOW() + 5 minutes.';
COMMENT ON COLUMN reminders.interval_minutes IS 'For recurring reminders, minutes between triggers';
COMMENT ON COLUMN reminders.days_of_week IS 'For weekly reminders, array of day numbers (0=Sunday, 6=Saturday)';

