-- ============================================================================
-- ADD 'name' COLUMN TO MEALS TABLE
-- Fixes 400 Bad Request error when creating meals
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add name column to meals table if it doesn't exist
ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN meals.name IS 'Optional meal name/description';

