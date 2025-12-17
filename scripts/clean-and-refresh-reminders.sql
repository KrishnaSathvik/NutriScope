-- ============================================================================
-- Script: Clean and Refresh All User Reminders
-- This script deletes all existing reminders so they can be recreated fresh
-- Run this in Supabase SQL Editor, then users just need to refresh their app
-- ============================================================================

-- Delete all existing reminders
DELETE FROM reminders;

-- Verify deletion
SELECT COUNT(*) as remaining_reminders FROM reminders;
-- Should return 0

-- After running this script:
-- 1. Users should refresh their app
-- 2. ReminderScheduler will automatically recreate reminders based on their settings
-- 3. All reminders will have fresh next_trigger_time values

