-- ============================================================================
-- Migration 026: Create Recipes Table
-- Creates recipes table for user recipe management
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  servings INTEGER NOT NULL DEFAULT 1,
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {name, quantity, unit}
  instructions TEXT[] DEFAULT ARRAY[]::TEXT[],
  nutrition_per_serving JSONB DEFAULT '{
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fats": 0
  }'::jsonb,
  image_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes (user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes (name);
CREATE INDEX IF NOT EXISTS idx_recipes_is_favorite ON recipes (is_favorite);

-- RLS Policies
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

