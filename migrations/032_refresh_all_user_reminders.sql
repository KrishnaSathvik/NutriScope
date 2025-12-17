-- ============================================================================
-- Migration 032: Refresh All User Reminders
-- This migration refreshes reminders for all existing users based on their current settings
-- ============================================================================

-- Function to refresh reminders for a single user based on their current settings
CREATE OR REPLACE FUNCTION refresh_user_reminders(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_settings JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_reminder_id TEXT;
  v_next_trigger TIMESTAMPTZ;
  v_interval_minutes INTEGER;
  v_start_time TEXT;
  v_end_time TEXT;
  v_days INTEGER[];
BEGIN
  -- Get user's reminder settings
  SELECT reminder_settings INTO v_settings
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- If no settings or reminders disabled, delete all reminders
  IF v_settings IS NULL OR (v_settings->>'enabled')::boolean = false THEN
    DELETE FROM reminders WHERE user_id = p_user_id;
    RETURN;
  END IF;
  
  -- Delete existing reminders for this user
  DELETE FROM reminders WHERE user_id = p_user_id;
  
  -- Meal Reminders
  IF (v_settings->'meal_reminders'->>'enabled')::boolean = true THEN
    -- Breakfast
    IF v_settings->'meal_reminders'->>'breakfast' IS NOT NULL THEN
      v_reminder_id := 'meal-breakfast-' || p_user_id::TEXT;
      v_next_trigger := calculate_daily_trigger_time(
        (v_settings->'meal_reminders'->>'breakfast')::TEXT,
        v_now
      );
      INSERT INTO reminders (
        id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
        title, body, tag, data, enabled, trigger_count
      ) VALUES (
        v_reminder_id, p_user_id, 'meal', 'daily', v_now, v_next_trigger,
        'Breakfast Time! 🍳', 'Time to log your breakfast and start your day right.',
        'meal-breakfast', jsonb_build_object('url', '/meals', 'time', v_settings->'meal_reminders'->>'breakfast'),
        true, 0
      );
    END IF;
    
    -- Lunch
    IF v_settings->'meal_reminders'->>'lunch' IS NOT NULL THEN
      v_reminder_id := 'meal-lunch-' || p_user_id::TEXT;
      v_next_trigger := calculate_daily_trigger_time(
        (v_settings->'meal_reminders'->>'lunch')::TEXT,
        v_now
      );
      INSERT INTO reminders (
        id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
        title, body, tag, data, enabled, trigger_count
      ) VALUES (
        v_reminder_id, p_user_id, 'meal', 'daily', v_now, v_next_trigger,
        'Lunch Time! 🥗', 'Don''t forget to log your lunch.',
        'meal-lunch', jsonb_build_object('url', '/meals', 'time', v_settings->'meal_reminders'->>'lunch'),
        true, 0
      );
    END IF;
    
    -- Dinner
    IF v_settings->'meal_reminders'->>'dinner' IS NOT NULL THEN
      v_reminder_id := 'meal-dinner-' || p_user_id::TEXT;
      v_next_trigger := calculate_daily_trigger_time(
        (v_settings->'meal_reminders'->>'dinner')::TEXT,
        v_now
      );
      INSERT INTO reminders (
        id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
        title, body, tag, data, enabled, trigger_count
      ) VALUES (
        v_reminder_id, p_user_id, 'meal', 'daily', v_now, v_next_trigger,
        'Dinner Time! 🍽️', 'Time to log your dinner.',
        'meal-dinner', jsonb_build_object('url', '/meals', 'time', v_settings->'meal_reminders'->>'dinner'),
        true, 0
      );
    END IF;
    
    -- Morning Snack
    IF v_settings->'meal_reminders'->>'morning_snack' IS NOT NULL THEN
      v_reminder_id := 'meal-morning-snack-' || p_user_id::TEXT;
      v_next_trigger := calculate_daily_trigger_time(
        (v_settings->'meal_reminders'->>'morning_snack')::TEXT,
        v_now
      );
      INSERT INTO reminders (
        id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
        title, body, tag, data, enabled, trigger_count
      ) VALUES (
        v_reminder_id, p_user_id, 'meal', 'daily', v_now, v_next_trigger,
        'Morning Snack Time! 🍎', 'Time for your morning snack.',
        'meal-morning-snack', jsonb_build_object('url', '/meals', 'time', v_settings->'meal_reminders'->>'morning_snack'),
        true, 0
      );
    END IF;
    
    -- Evening Snack
    IF v_settings->'meal_reminders'->>'evening_snack' IS NOT NULL THEN
      v_reminder_id := 'meal-evening-snack-' || p_user_id::TEXT;
      v_next_trigger := calculate_daily_trigger_time(
        (v_settings->'meal_reminders'->>'evening_snack')::TEXT,
        v_now
      );
      INSERT INTO reminders (
        id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
        title, body, tag, data, enabled, trigger_count
      ) VALUES (
        v_reminder_id, p_user_id, 'meal', 'daily', v_now, v_next_trigger,
        'Evening Snack Time! 🍪', 'Time for your evening snack.',
        'meal-evening-snack', jsonb_build_object('url', '/meals', 'time', v_settings->'meal_reminders'->>'evening_snack'),
        true, 0
      );
    END IF;
  END IF;
  
  -- Water Reminders
  IF (v_settings->'water_reminders'->>'enabled')::boolean = true THEN
    v_reminder_id := 'water-' || p_user_id::TEXT;
    v_interval_minutes := COALESCE((v_settings->'water_reminders'->>'interval_minutes')::INTEGER, 60);
    v_start_time := COALESCE(v_settings->'water_reminders'->>'start_time', '08:00');
    v_end_time := COALESCE(v_settings->'water_reminders'->>'end_time', '22:00');
    v_next_trigger := calculate_recurring_trigger_time(
      v_start_time,
      v_end_time,
      v_interval_minutes,
      v_now
    );
    INSERT INTO reminders (
      id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
      interval_minutes, start_time, end_time,
      title, body, tag, data, enabled, trigger_count
    ) VALUES (
      v_reminder_id, p_user_id, 'water', 'recurring', v_now, v_next_trigger,
      v_interval_minutes, v_start_time, v_end_time,
      'Stay Hydrated! 💧', 'It''s been ' || v_interval_minutes || ' minutes. Time for some water!',
      'water', jsonb_build_object('url', '/water'),
      true, 0
    );
  END IF;
  
  -- Workout Reminders
  IF (v_settings->'workout_reminders'->>'enabled')::boolean = true THEN
    v_reminder_id := 'workout-' || p_user_id::TEXT;
    v_days := ARRAY(SELECT jsonb_array_elements_text(v_settings->'workout_reminders'->'days')::INTEGER);
    IF v_days IS NULL OR array_length(v_days, 1) = 0 THEN
      v_days := ARRAY[1,2,3,4,5];
    END IF;
    v_next_trigger := calculate_weekly_trigger_time(
      COALESCE(v_settings->'workout_reminders'->>'time', '18:00'),
      v_days,
      v_now
    );
    INSERT INTO reminders (
      id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
      days_of_week,
      title, body, tag, data, enabled, trigger_count
    ) VALUES (
      v_reminder_id, p_user_id, 'workout', 'weekly', v_now, v_next_trigger,
      v_days,
      'Workout Time! 💪', 'Don''t forget to log your workout.',
      'workout', jsonb_build_object('url', '/workouts', 'time', COALESCE(v_settings->'workout_reminders'->>'time', '18:00')),
      true, 0
    );
  END IF;
  
  -- Goal Reminders
  IF (v_settings->'goal_reminders'->>'enabled')::boolean = true THEN
    v_reminder_id := 'goal-' || p_user_id::TEXT;
    v_next_trigger := calculate_daily_trigger_time(
      COALESCE(v_settings->'goal_reminders'->>'check_progress_time', '20:00'),
      v_now
    );
    INSERT INTO reminders (
      id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
      title, body, tag, data, enabled, trigger_count
    ) VALUES (
      v_reminder_id, p_user_id, 'goal', 'daily', v_now, v_next_trigger,
      'Goal Check-in! 🎯', 'Check your progress toward your daily goals.',
      'goal', jsonb_build_object('url', '/dashboard', 'time', COALESCE(v_settings->'goal_reminders'->>'check_progress_time', '20:00')),
      true, 0
    );
  END IF;
  
  -- Weight Reminders
  IF (v_settings->'weight_reminders'->>'enabled')::boolean = true THEN
    v_reminder_id := 'weight-' || p_user_id::TEXT;
    v_days := ARRAY(SELECT jsonb_array_elements_text(v_settings->'weight_reminders'->'days')::INTEGER);
    IF v_days IS NULL OR array_length(v_days, 1) = 0 OR array_length(v_days, 1) = 7 THEN
      -- Daily reminder
      v_next_trigger := calculate_daily_trigger_time(
        COALESCE(v_settings->'weight_reminders'->>'time', '08:00'),
        v_now
      );
      INSERT INTO reminders (
        id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
        title, body, tag, data, enabled, trigger_count
      ) VALUES (
        v_reminder_id, p_user_id, 'weight', 'daily', v_now, v_next_trigger,
        'Log Your Weight! ⚖️', 'Don''t forget to track your weight today.',
        'weight', jsonb_build_object('url', '/dashboard', 'time', COALESCE(v_settings->'weight_reminders'->>'time', '08:00')),
        true, 0
      );
    ELSE
      -- Weekly reminder
      v_next_trigger := calculate_weekly_trigger_time(
        COALESCE(v_settings->'weight_reminders'->>'time', '08:00'),
        v_days,
        v_now
      );
      INSERT INTO reminders (
        id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
        days_of_week,
        title, body, tag, data, enabled, trigger_count
      ) VALUES (
        v_reminder_id, p_user_id, 'weight', 'weekly', v_now, v_next_trigger,
        v_days,
        'Log Your Weight! ⚖️', 'Don''t forget to track your weight today.',
        'weight', jsonb_build_object('url', '/dashboard', 'time', COALESCE(v_settings->'weight_reminders'->>'time', '08:00')),
        true, 0
      );
    END IF;
  END IF;
  
  -- Streak Reminders
  IF (v_settings->'streak_reminders'->>'enabled')::boolean = true THEN
    v_reminder_id := 'streak-' || p_user_id::TEXT;
    v_days := ARRAY(SELECT jsonb_array_elements_text(v_settings->'streak_reminders'->'check_days')::INTEGER);
    IF v_days IS NULL OR array_length(v_days, 1) = 0 THEN
      v_days := ARRAY[1,2,3,4,5];
    END IF;
    v_next_trigger := calculate_weekly_trigger_time(
      COALESCE(v_settings->'streak_reminders'->>'time', '19:00'),
      v_days,
      v_now
    );
    INSERT INTO reminders (
      id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
      days_of_week,
      title, body, tag, data, enabled, trigger_count
    ) VALUES (
      v_reminder_id, p_user_id, 'streak', 'weekly', v_now, v_next_trigger,
      v_days,
      'Maintain Your Streak! 🔥', 'Log something today to keep your streak going!',
      'streak', jsonb_build_object('url', '/dashboard', 'time', COALESCE(v_settings->'streak_reminders'->>'time', '19:00')),
      true, 0
    );
  END IF;
  
  -- Summary Reminders
  IF (v_settings->'summary_reminders'->>'enabled')::boolean = true THEN
    v_reminder_id := 'summary-' || p_user_id::TEXT;
    v_next_trigger := calculate_daily_trigger_time(
      COALESCE(v_settings->'summary_reminders'->>'time', '20:00'),
      v_now
    );
    INSERT INTO reminders (
      id, user_id, type, reminder_type, scheduled_time, next_trigger_time,
      title, body, tag, data, enabled, trigger_count
    ) VALUES (
      v_reminder_id, p_user_id, 'summary', 'daily', v_now, v_next_trigger,
      'Daily Summary 📊', 'View your daily progress summary and insights.',
      'summary', jsonb_build_object('url', '/summary/' || to_char(v_now, 'YYYY-MM-DD')),
      true, 0
    );
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate daily trigger time
CREATE OR REPLACE FUNCTION calculate_daily_trigger_time(time_str TEXT, current_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_hours INTEGER;
  v_minutes INTEGER;
  v_next_trigger TIMESTAMPTZ;
BEGIN
  v_hours := (split_part(time_str, ':', 1))::INTEGER;
  v_minutes := (split_part(time_str, ':', 2))::INTEGER;
  v_next_trigger := date_trunc('day', current_time) + (v_hours || ' hours')::INTERVAL + (v_minutes || ' minutes')::INTERVAL;
  
  IF v_next_trigger <= current_time THEN
    v_next_trigger := v_next_trigger + '1 day'::INTERVAL;
  END IF;
  
  RETURN v_next_trigger;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to calculate weekly trigger time
CREATE OR REPLACE FUNCTION calculate_weekly_trigger_time(time_str TEXT, days INTEGER[], current_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_hours INTEGER;
  v_minutes INTEGER;
  v_current_day INTEGER;
  v_next_trigger TIMESTAMPTZ;
  v_days_until_next INTEGER := 7;
  v_day INTEGER;
  v_days_diff INTEGER;
BEGIN
  v_hours := (split_part(time_str, ':', 1))::INTEGER;
  v_minutes := (split_part(time_str, ':', 2))::INTEGER;
  v_current_day := EXTRACT(DOW FROM current_time)::INTEGER;
  
  -- If all 7 days selected, treat as daily
  IF array_length(days, 1) = 7 THEN
    RETURN calculate_daily_trigger_time(time_str, current_time);
  END IF;
  
  -- Find next day
  FOREACH v_day IN ARRAY days LOOP
    v_days_diff := v_day - v_current_day;
    IF v_days_diff < 0 THEN
      v_days_diff := v_days_diff + 7;
    END IF;
    IF v_days_diff < v_days_until_next THEN
      v_days_until_next := v_days_diff;
    END IF;
  END LOOP;
  
  v_next_trigger := date_trunc('day', current_time) + (v_days_until_next || ' days')::INTERVAL + (v_hours || ' hours')::INTERVAL + (v_minutes || ' minutes')::INTERVAL;
  
  -- If same day but time passed, find next day
  IF v_days_until_next = 0 AND v_next_trigger <= current_time THEN
    v_days_until_next := 7;
    FOREACH v_day IN ARRAY days LOOP
      IF v_day > v_current_day THEN
        v_days_diff := v_day - v_current_day;
        IF v_days_diff < v_days_until_next THEN
          v_days_until_next := v_days_diff;
        END IF;
      END IF;
    END LOOP;
    IF v_days_until_next = 7 THEN
      v_days_until_next := days[1] - v_current_day + 7;
    END IF;
    v_next_trigger := date_trunc('day', current_time) + (v_days_until_next || ' days')::INTERVAL + (v_hours || ' hours')::INTERVAL + (v_minutes || ' minutes')::INTERVAL;
  END IF;
  
  RETURN v_next_trigger;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to calculate recurring trigger time
CREATE OR REPLACE FUNCTION calculate_recurring_trigger_time(start_time_str TEXT, end_time_str TEXT, interval_minutes INTEGER, current_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_start_hours INTEGER;
  v_start_minutes INTEGER;
  v_end_hours INTEGER;
  v_end_minutes INTEGER;
  v_start_today TIMESTAMPTZ;
  v_end_today TIMESTAMPTZ;
  v_interval_ms BIGINT;
  v_time_since_start BIGINT;
  v_intervals_passed INTEGER;
  v_next_interval_time TIMESTAMPTZ;
BEGIN
  v_start_hours := (split_part(start_time_str, ':', 1))::INTEGER;
  v_start_minutes := (split_part(start_time_str, ':', 2))::INTEGER;
  v_end_hours := (split_part(end_time_str, ':', 1))::INTEGER;
  v_end_minutes := (split_part(end_time_str, ':', 2))::INTEGER;
  
  v_start_today := date_trunc('day', current_time) + (v_start_hours || ' hours')::INTERVAL + (v_start_minutes || ' minutes')::INTERVAL;
  v_end_today := date_trunc('day', current_time) + (v_end_hours || ' hours')::INTERVAL + (v_end_minutes || ' minutes')::INTERVAL;
  v_interval_ms := interval_minutes * 60 * 1000;
  
  IF v_start_today <= current_time THEN
    v_time_since_start := EXTRACT(EPOCH FROM (current_time - v_start_today)) * 1000;
    v_intervals_passed := FLOOR(v_time_since_start / v_interval_ms);
    v_next_interval_time := v_start_today + ((v_intervals_passed + 1) * interval_minutes || ' minutes')::INTERVAL;
    
    IF v_next_interval_time > v_end_today THEN
      v_next_interval_time := v_start_today + '1 day'::INTERVAL;
    END IF;
  ELSE
    v_next_interval_time := v_start_today;
  END IF;
  
  RETURN v_next_interval_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Refresh reminders for all users who have reminder settings
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN 
    SELECT id FROM user_profiles 
    WHERE reminder_settings IS NOT NULL 
    AND (reminder_settings->>'enabled')::boolean = true
  LOOP
    BEGIN
      PERFORM refresh_user_reminders(v_user_id);
      RAISE NOTICE 'Refreshed reminders for user %', v_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh reminders for user %: %', v_user_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION refresh_user_reminders IS 'Refreshes all reminders for a user based on their current reminder settings';
COMMENT ON FUNCTION calculate_daily_trigger_time IS 'Calculates next trigger time for a daily reminder';
COMMENT ON FUNCTION calculate_weekly_trigger_time IS 'Calculates next trigger time for a weekly reminder';
COMMENT ON FUNCTION calculate_recurring_trigger_time IS 'Calculates next trigger time for a recurring reminder';

