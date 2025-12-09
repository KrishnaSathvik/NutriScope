-- ============================================================================
-- WEIGHT TRACKING SCHEMA
-- Add this to your Supabase SQL Editor
-- ============================================================================

-- Weight Logs Table
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL, -- in kg
  body_fat_percentage DECIMAL(4,2), -- optional, percentage
  muscle_mass DECIMAL(5,2), -- optional, in kg
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_weight_logs_updated_at
  BEFORE UPDATE ON weight_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own weight logs"
  ON weight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs"
  ON weight_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs"
  ON weight_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate BMI
CREATE OR REPLACE FUNCTION calculate_bmi(weight_kg DECIMAL, height_cm INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  IF height_cm IS NULL OR height_cm <= 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::DECIMAL, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to get BMI category
CREATE OR REPLACE FUNCTION get_bmi_category(bmi DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF bmi IS NULL THEN
    RETURN NULL;
  ELSIF bmi < 18.5 THEN
    RETURN 'underweight';
  ELSIF bmi < 25 THEN
    RETURN 'normal';
  ELSIF bmi < 30 THEN
    RETURN 'overweight';
  ELSE
    RETURN 'obese';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest weight
CREATE OR REPLACE FUNCTION get_latest_weight(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  latest_weight DECIMAL;
BEGIN
  SELECT weight INTO latest_weight
  FROM weight_logs
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;
  
  RETURN latest_weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get weight change (current vs previous)
CREATE OR REPLACE FUNCTION get_weight_change(p_user_id UUID, days_back INTEGER DEFAULT 7)
RETURNS DECIMAL AS $$
DECLARE
  current_weight DECIMAL;
  previous_weight DECIMAL;
BEGIN
  -- Get current weight (latest entry)
  SELECT weight INTO current_weight
  FROM weight_logs
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;
  
  -- Get weight from X days ago
  SELECT weight INTO previous_weight
  FROM weight_logs
  WHERE user_id = p_user_id
  AND date <= CURRENT_DATE - (days_back || ' days')::INTERVAL
  ORDER BY date DESC
  LIMIT 1;
  
  IF current_weight IS NULL OR previous_weight IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND((current_weight - previous_weight)::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE weight_logs IS 'User weight tracking logs with optional body composition data';
COMMENT ON COLUMN weight_logs.weight IS 'Weight in kilograms';
COMMENT ON COLUMN weight_logs.body_fat_percentage IS 'Body fat percentage (optional)';
COMMENT ON COLUMN weight_logs.muscle_mass IS 'Muscle mass in kilograms (optional)';
COMMENT ON FUNCTION calculate_bmi IS 'Calculates BMI: weight (kg) / height (m)²';
COMMENT ON FUNCTION get_bmi_category IS 'Returns BMI category: underweight, normal, overweight, obese';

DO $$
BEGIN
  RAISE NOTICE '✅ Weight Tracking schema created successfully!';
  RAISE NOTICE '📋 Table: weight_logs';
  RAISE NOTICE '⚡ Indexes created for fast queries';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '🧮 Functions: calculate_bmi(), get_bmi_category(), get_latest_weight(), get_weight_change()';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now track weight and body composition!';
END $$;

