-- ============================================================================
-- Migration 021: Create Meal Plans Table
-- Creates meal_plans table for weekly meal planning
-- ============================================================================

-- MEAL PLANS TABLE
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Monday of the week
  planned_meals JSONB NOT NULL DEFAULT '{}'::jsonb, -- {day: [{meal_type, recipe_id, meal_data}]}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON meal_plans (week_start_date);

-- RLS Policies
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal_plans" ON meal_plans;

CREATE POLICY "Users can view own meal_plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal_plans"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal_plans"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal_plans"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;
CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

