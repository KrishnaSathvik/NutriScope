-- ============================================================================
-- RECIPE LIBRARY TABLE
-- Pre-built recipes for different goals and cuisines
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipe_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('lose_weight', 'gain_muscle', 'gain_weight', 'improve_fitness', 'maintain')),
  cuisine TEXT NOT NULL CHECK (cuisine IN ('indian', 'italian', 'american', 'mexican', 'mediterranean', 'asian', 'other')),
  servings INTEGER NOT NULL DEFAULT 4,
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  instructions TEXT NOT NULL, -- Full recipe instructions
  nutrition_per_serving JSONB NOT NULL DEFAULT '{
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fats": 0
  }'::jsonb,
  ingredients JSONB DEFAULT '[]'::jsonb, -- Array of {name, quantity, unit}
  image_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for recipe_library
CREATE INDEX IF NOT EXISTS idx_recipe_library_name ON recipe_library(name);
CREATE INDEX IF NOT EXISTS idx_recipe_library_goal_type ON recipe_library(goal_type);
CREATE INDEX IF NOT EXISTS idx_recipe_library_cuisine ON recipe_library(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipe_library_goal_cuisine ON recipe_library(goal_type, cuisine);

-- RLS Policies for recipe_library
ALTER TABLE recipe_library ENABLE ROW LEVEL SECURITY;

-- Anyone can view recipe library (public recipes)
CREATE POLICY "Anyone can view recipe library"
  ON recipe_library FOR SELECT
  USING (true);

-- Only authenticated users can insert (for admin/curation)
CREATE POLICY "Authenticated users can insert recipes"
  ON recipe_library FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update recipes"
  ON recipe_library FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete recipes"
  ON recipe_library FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE recipe_library IS 'Pre-built recipe library for different fitness goals and cuisines';
COMMENT ON COLUMN recipe_library.goal_type IS 'Fitness goal this recipe is optimized for';
COMMENT ON COLUMN recipe_library.cuisine IS 'Cuisine type of the recipe';
COMMENT ON COLUMN recipe_library.nutrition_per_serving IS 'Nutrition values per serving (calories, protein, carbs, fats)';
COMMENT ON COLUMN recipe_library.ingredients IS 'Array of ingredients with name, quantity, and unit';

