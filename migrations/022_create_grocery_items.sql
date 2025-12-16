-- ============================================================================
-- Migration 022: Create Grocery Items Table
-- Creates grocery_items table for autocomplete/search functionality
-- ============================================================================

-- Grocery Items Database Table
-- Stores common grocery items for autocomplete/search functionality
CREATE TABLE IF NOT EXISTS grocery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('meat', 'dairy', 'produce', 'pantry', 'beverages', 'frozen', 'other')),
  common_names TEXT[], -- Alternative names (e.g., ['tomatoes', 'tomato'])
  search_count INTEGER DEFAULT 0, -- Track popularity for sorting
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_grocery_items_name ON grocery_items USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_grocery_items_category ON grocery_items (category);
CREATE INDEX IF NOT EXISTS idx_grocery_items_search_count ON grocery_items (search_count DESC);

-- Enable RLS (public read access for suggestions)
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read grocery items (for autocomplete)
CREATE POLICY "Anyone can view grocery_items"
  ON grocery_items FOR SELECT
  USING (true);

-- Only authenticated users can insert/update (for admin or user-contributed items)
CREATE POLICY "Authenticated users can insert grocery_items"
  ON grocery_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update grocery_items"
  ON grocery_items FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Insert common grocery items
INSERT INTO grocery_items (name, category, common_names) VALUES
-- Produce
('Apples', 'produce', ARRAY['apple']),
('Bananas', 'produce', ARRAY['banana']),
('Oranges', 'produce', ARRAY['orange']),
('Tomatoes', 'produce', ARRAY['tomato']),
('Onions', 'produce', ARRAY['onion']),
('Potatoes', 'produce', ARRAY['potato']),
('Carrots', 'produce', ARRAY['carrot']),
('Lettuce', 'produce', ARRAY['lettuce', 'salad']),
('Spinach', 'produce', ARRAY['spinach']),
('Broccoli', 'produce', ARRAY['broccoli']),
('Bell Peppers', 'produce', ARRAY['pepper', 'bell pepper', 'capsicum']),
('Cucumber', 'produce', ARRAY['cucumber']),
('Garlic', 'produce', ARRAY['garlic']),
('Ginger', 'produce', ARRAY['ginger']),
('Avocado', 'produce', ARRAY['avocado']),
('Mushrooms', 'produce', ARRAY['mushroom']),
('Celery', 'produce', ARRAY['celery']),
('Corn', 'produce', ARRAY['corn']),
-- Dairy
('Milk', 'dairy', ARRAY['milk']),
('Eggs', 'dairy', ARRAY['egg']),
('Cheese', 'dairy', ARRAY['cheese']),
('Butter', 'dairy', ARRAY['butter']),
('Yogurt', 'dairy', ARRAY['yogurt', 'yoghurt']),
('Sour Cream', 'dairy', ARRAY['sour cream']),
('Cottage Cheese', 'dairy', ARRAY['cottage cheese']),
('Cream', 'dairy', ARRAY['cream']),
-- Meat
('Chicken Breast', 'meat', ARRAY['chicken', 'chicken breast']),
('Ground Beef', 'meat', ARRAY['beef', 'ground beef', 'mince']),
('Salmon', 'meat', ARRAY['salmon', 'fish']),
('Tuna', 'meat', ARRAY['tuna', 'fish']),
('Turkey', 'meat', ARRAY['turkey']),
('Bacon', 'meat', ARRAY['bacon']),
('Sausage', 'meat', ARRAY['sausage']),
('Ham', 'meat', ARRAY['ham']),
('Pork', 'meat', ARRAY['pork']),
-- Pantry
('Rice', 'pantry', ARRAY['rice']),
('Pasta', 'pantry', ARRAY['pasta', 'noodles']),
('Bread', 'pantry', ARRAY['bread']),
('Flour', 'pantry', ARRAY['flour']),
('Sugar', 'pantry', ARRAY['sugar']),
('Salt', 'pantry', ARRAY['salt']),
('Pepper', 'pantry', ARRAY['pepper', 'black pepper']),
('Olive Oil', 'pantry', ARRAY['oil', 'olive oil']),
('Vegetable Oil', 'pantry', ARRAY['vegetable oil', 'cooking oil']),
('Vinegar', 'pantry', ARRAY['vinegar']),
('Cereal', 'pantry', ARRAY['cereal']),
('Oatmeal', 'pantry', ARRAY['oatmeal', 'oats']),
('Canned Tomatoes', 'pantry', ARRAY['canned tomatoes', 'tomato can']),
('Canned Beans', 'pantry', ARRAY['canned beans', 'beans']),
('Soup', 'pantry', ARRAY['soup']),
('Sauce', 'pantry', ARRAY['sauce']),
-- Beverages
('Water', 'beverages', ARRAY['water']),
('Juice', 'beverages', ARRAY['juice']),
('Coffee', 'beverages', ARRAY['coffee']),
('Tea', 'beverages', ARRAY['tea']),
('Soda', 'beverages', ARRAY['soda', 'soft drink', 'pop']),
-- Frozen
('Frozen Vegetables', 'frozen', ARRAY['frozen vegetables', 'frozen veggies']),
('Ice Cream', 'frozen', ARRAY['ice cream'])
ON CONFLICT (name) DO NOTHING;

-- Function to update search_count when item is searched
CREATE OR REPLACE FUNCTION increment_grocery_item_search_count(item_name TEXT)
RETURNS void AS $$
BEGIN
  UPDATE grocery_items
  SET search_count = search_count + 1,
      updated_at = NOW()
  WHERE LOWER(name) = LOWER(item_name)
     OR (common_names IS NOT NULL AND LOWER(item_name) = ANY(SELECT LOWER(unnest(common_names))));
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_grocery_item_search_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_grocery_item_search_count(TEXT) TO anon;

