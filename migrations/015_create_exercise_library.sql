-- ============================================================================
-- Migration 015: Create Exercise Library Table
-- Creates exercise_library table with MET values for calorie calculations
-- ============================================================================

-- Exercise Library Table
CREATE TABLE IF NOT EXISTS exercise_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cardio', 'strength', 'yoga', 'sports', 'other')),
  met_value DECIMAL(4,2) NOT NULL,
  muscle_groups TEXT[] DEFAULT ARRAY[]::TEXT[],
  equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
  instructions TEXT,
  video_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast searches
CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON exercise_library(name);
CREATE INDEX IF NOT EXISTS idx_exercise_library_type ON exercise_library(type);
CREATE INDEX IF NOT EXISTS idx_exercise_library_muscle_groups ON exercise_library USING GIN(muscle_groups);
CREATE INDEX IF NOT EXISTS idx_exercise_library_met_value ON exercise_library(met_value);

-- Enable RLS
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access (everyone can browse exercises)
CREATE POLICY "Anyone can view exercise library"
  ON exercise_library FOR SELECT
  USING (true);

-- Only authenticated users can insert (for admin/curation)
CREATE POLICY "Authenticated users can insert exercises"
  ON exercise_library FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update exercises"
  ON exercise_library FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete exercises"
  ON exercise_library FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add exercise_library_id to exercises table (optional, for linking)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_library_id UUID REFERENCES exercise_library(id);

-- Function to calculate calories burned using METs
CREATE OR REPLACE FUNCTION calculate_calories_from_mets(
  met_value DECIMAL,
  weight_kg DECIMAL,
  duration_minutes INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  -- Formula: METs × Weight (kg) × Duration (hours)
  RETURN ROUND((met_value * weight_kg * (duration_minutes / 60.0))::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE exercise_library IS 'Reference library of exercises with MET values for calorie calculation';
COMMENT ON COLUMN exercise_library.met_value IS 'Metabolic Equivalent of Task - used to calculate calories burned';
COMMENT ON FUNCTION calculate_calories_from_mets IS 'Calculates calories burned: METs × Weight (kg) × Duration (hours)';

