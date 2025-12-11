-- ============================================================================
-- ADD UNIT_SYSTEM COLUMN TO user_profiles
-- Migration: 003_add_unit_system_column.sql
-- Description: Adds unit_system column to store user's preferred unit system (metric/imperial)
-- ============================================================================

-- Add unit_system column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS unit_system TEXT CHECK (unit_system IN ('metric', 'imperial')) DEFAULT 'metric';

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.unit_system IS 'User preferred unit system: metric (kg/cm) or imperial (lbs/ft+in). Defaults to metric.';

