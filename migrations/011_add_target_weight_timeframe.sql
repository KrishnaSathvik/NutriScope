-- ============================================================================
-- ADD TARGET WEIGHT AND TIMEFRAME COLUMNS
-- This migration adds support for target weight and timeframe-based calorie calculations
-- ============================================================================

-- Add target_weight column (in kg, nullable)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS target_weight DECIMAL(5,2);

-- Add timeframe_months column (nullable, 1-24 months)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS timeframe_months INTEGER CHECK (timeframe_months IS NULL OR (timeframe_months >= 1 AND timeframe_months <= 24));

-- Add comment
COMMENT ON COLUMN user_profiles.target_weight IS 'Target weight in kg for personalized calorie calculation';
COMMENT ON COLUMN user_profiles.timeframe_months IS 'Timeframe in months to reach target weight (1-24 months)';

