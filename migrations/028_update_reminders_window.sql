-- ============================================================================
-- Migration 028: Update Reminders Window
-- Increase the window for fetching overdue reminders from 5 to 30 minutes
-- ============================================================================

-- Update function to get upcoming reminders with longer overdue window
CREATE OR REPLACE FUNCTION get_upcoming_reminders(
  p_user_id UUID,
  p_window_minutes INTEGER DEFAULT 30
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

COMMENT ON FUNCTION get_upcoming_reminders IS 'Fetches reminders within the specified window (default 30 minutes future) and up to 30 minutes past to catch overdue reminders.';

