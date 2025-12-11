-- ============================================================================
-- CREATE MEAL LIBRARY TABLE
-- Migration: 005_create_meal_library.sql
-- Description: Creates meal_library table for pre-defined meals from different cuisines
-- ============================================================================

-- Meal Library Table
CREATE TABLE IF NOT EXISTS meal_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cuisine TEXT NOT NULL CHECK (cuisine IN ('indian', 'mexican', 'american', 'mediterranean', 'italian', 'asian', 'other')),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('pre_breakfast', 'breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'post_dinner')),
  description TEXT,
  -- Base nutrition values (per 1 serving)
  calories INTEGER NOT NULL DEFAULT 0,
  protein INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER,
  fats INTEGER,
  -- Serving size description (e.g., "1 plate", "1 bowl", "2 pieces")
  serving_size TEXT DEFAULT '1 serving',
  -- Food items breakdown (optional)
  food_items JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast searches
CREATE INDEX IF NOT EXISTS idx_meal_library_name ON meal_library(name);
CREATE INDEX IF NOT EXISTS idx_meal_library_cuisine ON meal_library(cuisine);
CREATE INDEX IF NOT EXISTS idx_meal_library_meal_type ON meal_library(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_library_cuisine_meal_type ON meal_library(cuisine, meal_type);

-- Enable RLS
ALTER TABLE meal_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access (everyone can browse meals)
CREATE POLICY "Anyone can view meal library"
  ON meal_library FOR SELECT
  USING (true);

-- Only authenticated users can insert (for admin/curation)
CREATE POLICY "Authenticated users can insert meals"
  ON meal_library FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update meals"
  ON meal_library FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete meals"
  ON meal_library FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE meal_library IS 'Reference library of meals from different cuisines with nutrition values per serving';
COMMENT ON COLUMN meal_library.calories IS 'Calories per 1 serving (base value)';
COMMENT ON COLUMN meal_library.protein IS 'Protein (g) per 1 serving (base value)';
COMMENT ON COLUMN meal_library.carbs IS 'Carbs (g) per 1 serving (base value)';
COMMENT ON COLUMN meal_library.fats IS 'Fats (g) per 1 serving (base value)';
COMMENT ON COLUMN meal_library.serving_size IS 'Description of serving size (e.g., "1 plate", "1 bowl", "2 pieces")';

