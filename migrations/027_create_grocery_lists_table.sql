-- ============================================================================
-- Migration 027: Create Grocery Lists Table
-- Creates grocery_lists table for shopping list management
-- ============================================================================

CREATE TABLE IF NOT EXISTS grocery_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Shopping List',
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {name, quantity, unit, checked, category}
  week_start_date DATE, -- Associated meal plan week
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_id ON grocery_lists (user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_week_start ON grocery_lists (week_start_date);

-- RLS Policies
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grocery_lists"
  ON grocery_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grocery_lists"
  ON grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grocery_lists"
  ON grocery_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own grocery_lists"
  ON grocery_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_grocery_lists_updated_at
  BEFORE UPDATE ON grocery_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

