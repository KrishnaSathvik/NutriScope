-- ============================================================================
-- ADD GOALS ARRAY COLUMN FOR MULTI-SELECTION
-- This migration adds support for multiple goals per user
-- ============================================================================

-- Add goals column as TEXT[] array (nullable, for backward compatibility)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS goals TEXT[];

-- Migrate existing single goal to goals array
UPDATE user_profiles 
SET goals = ARRAY[goal]::TEXT[]
WHERE goals IS NULL AND goal IS NOT NULL;

-- Create a function to validate goals array (PostgreSQL doesn't allow subqueries in CHECK constraints)
CREATE OR REPLACE FUNCTION validate_goals_array(goals_array TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  -- If NULL or empty, it's valid
  IF goals_array IS NULL OR array_length(goals_array, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if all elements are valid goal types
  RETURN (
    SELECT bool_and(g IN (
      'lose_weight', 'gain_muscle', 'gain_weight', 'maintain', 
      'improve_fitness', 'build_endurance', 'improve_health', 
      'body_recomposition', 'increase_energy', 'reduce_body_fat'
    ))
    FROM unnest(goals_array) AS g
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing constraint if it exists
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_goals_check;

-- Add check constraint using the function
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_goals_check 
CHECK (validate_goals_array(goals));

-- Create index for array queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_goals ON user_profiles USING GIN(goals);

-- Add comment
COMMENT ON COLUMN user_profiles.goals IS 'Array of user goals for multi-selection support';
