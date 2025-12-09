-- ============================================================================
-- UPDATE REMINDER SETTINGS SCHEMA (FIXED)
-- Add new reminder types: weight_reminders, streak_reminders, summary_reminders
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Update the default value for reminder_settings to include new reminder types
-- Using jsonb_build_object to avoid JSON syntax errors
ALTER TABLE user_profiles 
ALTER COLUMN reminder_settings 
SET DEFAULT jsonb_build_object(
  'enabled', false,
  'meal_reminders', jsonb_build_object(
    'enabled', false,
    'breakfast', '08:00',
    'lunch', '12:30',
    'dinner', '19:00',
    'morning_snack', '10:00',
    'evening_snack', '15:00'
  ),
  'water_reminders', jsonb_build_object(
    'enabled', false,
    'interval_minutes', 60,
    'start_time', '08:00',
    'end_time', '22:00'
  ),
  'workout_reminders', jsonb_build_object(
    'enabled', false,
    'time', '18:00',
    'days', jsonb_build_array(1,2,3,4,5)
  ),
  'goal_reminders', jsonb_build_object(
    'enabled', false,
    'check_progress_time', '20:00'
  ),
  'weight_reminders', jsonb_build_object(
    'enabled', false,
    'time', '08:00',
    'days', jsonb_build_array(1,2,3,4,5,6,0)
  ),
  'streak_reminders', jsonb_build_object(
    'enabled', false,
    'time', '19:00',
    'check_days', jsonb_build_array(1,2,3,4,5)
  ),
  'summary_reminders', jsonb_build_object(
    'enabled', false,
    'time', '20:00'
  )
);

-- Update existing records to include new reminder types (if they don't exist)
-- This ensures backward compatibility with existing users
-- Using jsonb merge operator (||) instead of nested jsonb_set
UPDATE user_profiles
SET reminder_settings = 
  COALESCE(reminder_settings, '{}'::jsonb)
  || jsonb_build_object(
    'weight_reminders',
    COALESCE(reminder_settings->'weight_reminders', jsonb_build_object(
      'enabled', false,
      'time', '08:00',
      'days', jsonb_build_array(1,2,3,4,5,6,0)
    )),
    'streak_reminders',
    COALESCE(reminder_settings->'streak_reminders', jsonb_build_object(
      'enabled', false,
      'time', '19:00',
      'check_days', jsonb_build_array(1,2,3,4,5)
    )),
    'summary_reminders',
    COALESCE(reminder_settings->'summary_reminders', jsonb_build_object(
      'enabled', false,
      'time', '20:00'
    ))
  )
WHERE reminder_settings IS NOT NULL
  AND (
    reminder_settings->'weight_reminders' IS NULL
    OR reminder_settings->'streak_reminders' IS NULL
    OR reminder_settings->'summary_reminders' IS NULL
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if update was successful
DO $$
DECLARE
  updated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM user_profiles
  WHERE reminder_settings->'weight_reminders' IS NOT NULL
    AND reminder_settings->'streak_reminders' IS NOT NULL
    AND reminder_settings->'summary_reminders' IS NOT NULL;
  
  SELECT COUNT(*) INTO total_count
  FROM user_profiles
  WHERE reminder_settings IS NOT NULL;
  
  RAISE NOTICE '✅ Reminder settings schema updated successfully!';
  RAISE NOTICE '📊 Updated % out of % user profiles with new reminder types', updated_count, total_count;
END $$;

