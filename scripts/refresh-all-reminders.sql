-- ============================================================================
-- Script: Refresh All User Reminders
-- This script refreshes reminders for all existing users
-- Run this in Supabase SQL Editor to refresh reminders for all users
-- ============================================================================

-- Option 1: Delete all existing reminders (clean slate)
-- Uncomment the line below if you want to start fresh
-- DELETE FROM reminders;

-- Option 2: Refresh reminders for all users based on their current settings
-- This uses the refresh_user_reminders function from migration 032

DO $$
DECLARE
  v_user_id UUID;
  v_refreshed_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting reminder refresh for all users...';
  
  FOR v_user_id IN 
    SELECT id FROM user_profiles 
    WHERE reminder_settings IS NOT NULL 
    AND (reminder_settings->>'enabled')::boolean = true
  LOOP
    BEGIN
      PERFORM refresh_user_reminders(v_user_id);
      v_refreshed_count := v_refreshed_count + 1;
      RAISE NOTICE '✅ Refreshed reminders for user %', v_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING '❌ Failed to refresh reminders for user %: %', v_user_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Refresh complete!';
  RAISE NOTICE 'Successfully refreshed: % users', v_refreshed_count;
  RAISE NOTICE 'Failed: % users', v_error_count;
  RAISE NOTICE '========================================';
END;
$$;

-- Verify the refresh worked
SELECT 
  user_id,
  COUNT(*) as reminder_count,
  MIN(next_trigger_time) as next_trigger,
  MAX(next_trigger_time) as last_trigger
FROM reminders
WHERE enabled = true
GROUP BY user_id
ORDER BY reminder_count DESC;

