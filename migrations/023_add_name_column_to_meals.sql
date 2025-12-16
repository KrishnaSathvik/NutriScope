-- ============================================================================
-- Migration 023: Add Name Column to Meals Table
-- Adds optional name column to meals table for better meal identification
-- ============================================================================

-- Add name column to meals table if it doesn't exist
ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN meals.name IS 'Optional meal name/description';

