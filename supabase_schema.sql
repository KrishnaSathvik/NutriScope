-- ============================================================================
-- NUTRISCOPE DATABASE SCHEMA
-- Complete SQL schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- User Profiles Table
-- Stores user profile information, goals, targets, and reminder settings
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  age INTEGER,
  weight DECIMAL(5,2), -- in kg
  height INTEGER, -- in cm
  gender TEXT CHECK (gender IN ('male', 'female')), -- for BMR calculation
  goal TEXT NOT NULL DEFAULT 'maintain' CHECK (goal IN ('lose_weight', 'gain_muscle', 'maintain', 'improve_fitness')),
  activity_level TEXT NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  dietary_preference TEXT NOT NULL DEFAULT 'flexitarian' CHECK (dietary_preference IN ('vegetarian', 'vegan', 'non_vegetarian', 'flexitarian')),
  calorie_target INTEGER DEFAULT 2000,
  target_calories INTEGER DEFAULT 2000,
  protein_target INTEGER DEFAULT 150,
  target_protein INTEGER DEFAULT 150,
  target_carbs INTEGER,
  target_fats INTEGER,
  water_goal INTEGER DEFAULT 2000, -- in ml
  restrictions TEXT[], -- Array of dietary restrictions
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_settings JSONB DEFAULT '{
    "enabled": false,
    "meal_reminders": {
      "enabled": false,
      "breakfast": "08:00",
      "lunch": "12:30",
      "dinner": "19:00",
      "morning_snack": "10:00",
      "evening_snack": "15:00"
    },
    "water_reminders": {
      "enabled": false,
      "interval_minutes": 60,
      "start_time": "08:00",
      "end_time": "22:00"
    },
    "workout_reminders": {
      "enabled": false,
      "time": "18:00",
      "days": [1,2,3,4,5]
    },
    "goal_reminders": {
      "enabled": false,
      "check_progress_time": "20:00"
    },
    "weight_reminders": {
      "enabled": false,
      "time": "08:00",
      "days": [1,2,3,4,5,6,0]
    },
    "streak_reminders": {
      "enabled": false,
      "time": "19:00",
      "check_days": [1,2,3,4,5]
    },
    "summary_reminders": {
      "enabled": false,
      "time": "20:00"
    }
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meals Table
-- Stores individual meal logs
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  meal_type TEXT CHECK (meal_type IN ('pre_breakfast', 'breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'post_dinner')),
  name TEXT, -- Optional meal name/description
  calories INTEGER NOT NULL DEFAULT 0,
  protein INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER,
  fats INTEGER,
  food_items JSONB DEFAULT '[]'::jsonb, -- Array of FoodItem objects
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercises Table (Workouts)
-- Stores workout/exercise logs
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of ExerciseDetail objects
  calories_burned INTEGER NOT NULL DEFAULT 0,
  duration INTEGER, -- in minutes
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily Logs Table
-- Stores aggregated daily nutrition and activity data
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  water_intake_ml INTEGER DEFAULT 0,
  total_calories_consumed INTEGER DEFAULT 0,
  total_protein INTEGER DEFAULT 0,
  total_carbs INTEGER DEFAULT 0,
  total_fats INTEGER DEFAULT 0,
  total_calories_burned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Meal Templates Table
-- Stores saved meal templates for quick logging
CREATE TABLE IF NOT EXISTS meal_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('pre_breakfast', 'breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'post_dinner')),
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fats INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat Conversations Table
-- Stores AI chat conversation history
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of ChatMessage objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email) WHERE email IS NOT NULL;

-- Meals Indexes
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals(meal_type) WHERE meal_type IS NOT NULL;

-- Exercises Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date);
CREATE INDEX IF NOT EXISTS idx_exercises_user_date ON exercises(user_id, date);

-- Daily Logs Indexes
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);

-- Meal Templates Indexes
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id ON meal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_templates_meal_type ON meal_templates(meal_type);

-- Chat Conversations Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_templates_updated_at
  BEFORE UPDATE ON meal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = id OR auth.uid() = user_id);

-- Meals Policies
-- Users can read their own meals
CREATE POLICY "Users can view own meals"
  ON meals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own meals
CREATE POLICY "Users can insert own meals"
  ON meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own meals
CREATE POLICY "Users can update own meals"
  ON meals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own meals
CREATE POLICY "Users can delete own meals"
  ON meals FOR DELETE
  USING (auth.uid() = user_id);

-- Exercises Policies
-- Users can read their own exercises
CREATE POLICY "Users can view own exercises"
  ON exercises FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own exercises
CREATE POLICY "Users can insert own exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own exercises
CREATE POLICY "Users can update own exercises"
  ON exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own exercises
CREATE POLICY "Users can delete own exercises"
  ON exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Logs Policies
-- Users can read their own daily logs
CREATE POLICY "Users can view own daily logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own daily logs
CREATE POLICY "Users can insert own daily logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own daily logs
CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own daily logs
CREATE POLICY "Users can delete own daily logs"
  ON daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Meal Templates Policies
-- Users can read their own meal templates
CREATE POLICY "Users can view own meal templates"
  ON meal_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own meal templates
CREATE POLICY "Users can insert own meal templates"
  ON meal_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own meal templates
CREATE POLICY "Users can update own meal templates"
  ON meal_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own meal templates
CREATE POLICY "Users can delete own meal templates"
  ON meal_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Conversations Policies
-- Users can read their own conversations
CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
  ON chat_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
  ON chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for images (chat, meals, workouts all use same bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('chat-images', 'chat-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for chat-images bucket
-- Allow authenticated users (including anonymous) to upload their own images
-- Path format in bucket: {user_id}/{folder}/{timestamp}.{ext}
-- Note: The upload path should be relative to bucket root (e.g., "{user_id}/chat/{timestamp}.jpg")
-- If your code includes "chat-images/" prefix, remove it from the upload path
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access (for displaying images)
CREATE POLICY "Public can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own images (if needed)
CREATE POLICY "Users can update own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chat-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'chat-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's daily summary
CREATE OR REPLACE FUNCTION get_daily_summary(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  calories_consumed INTEGER,
  calories_burned INTEGER,
  net_calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fats INTEGER,
  water_intake INTEGER
) AS $$
DECLARE
  v_calories_consumed INTEGER := 0;
  v_calories_burned INTEGER := 0;
  v_protein INTEGER := 0;
  v_carbs INTEGER := 0;
  v_fats INTEGER := 0;
  v_water_intake INTEGER := 0;
BEGIN
  -- Get meals data
  SELECT 
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein), 0),
    COALESCE(SUM(carbs), 0),
    COALESCE(SUM(fats), 0)
  INTO v_calories_consumed, v_protein, v_carbs, v_fats
  FROM meals
  WHERE user_id = p_user_id AND date = p_date;

  -- Get exercises data
  SELECT COALESCE(SUM(calories_burned), 0)
  INTO v_calories_burned
  FROM exercises
  WHERE user_id = p_user_id AND date = p_date;

  -- Get water intake
  SELECT COALESCE(water_intake_ml, 0)
  INTO v_water_intake
  FROM daily_logs
  WHERE user_id = p_user_id AND date = p_date;

  RETURN QUERY SELECT
    v_calories_consumed,
    v_calories_burned,
    (v_calories_consumed - v_calories_burned),
    v_protein,
    v_carbs,
    v_fats,
    v_water_intake;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'User profile information including goals, targets, and reminder settings';
COMMENT ON TABLE meals IS 'Individual meal logs with nutrition information';
COMMENT ON TABLE exercises IS 'Workout/exercise logs with calories burned';
COMMENT ON TABLE daily_logs IS 'Aggregated daily nutrition and activity summaries';
COMMENT ON TABLE meal_templates IS 'Saved meal templates for quick logging';
COMMENT ON TABLE chat_conversations IS 'AI chat conversation history';

COMMENT ON COLUMN user_profiles.reminder_settings IS 'JSONB object containing reminder configuration';
COMMENT ON COLUMN meals.food_items IS 'JSONB array of FoodItem objects';
COMMENT ON COLUMN exercises.exercises IS 'JSONB array of ExerciseDetail objects';
COMMENT ON COLUMN chat_conversations.messages IS 'JSONB array of ChatMessage objects';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant necessary permissions (if needed)
-- These are typically handled by Supabase automatically, but included for completeness

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ NutriScope database schema created successfully!';
  RAISE NOTICE '📋 Tables created: user_profiles, meals, exercises, daily_logs, meal_templates, chat_conversations';
  RAISE NOTICE '🔒 RLS policies enabled for all tables (supports anonymous users)';
  RAISE NOTICE '📦 Storage bucket created: chat-images (for all image uploads)';
  RAISE NOTICE '⚡ Indexes created for optimal query performance';
  RAISE NOTICE '🔄 Triggers created for automatic updated_at timestamps';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Enable Anonymous Authentication in Supabase Dashboard → Authentication → Providers';
  RAISE NOTICE '2. Verify all RLS policies are active in the Supabase Dashboard';
  RAISE NOTICE '3. Test the application with a test user';
  RAISE NOTICE '4. Verify storage bucket policies are working correctly';
END $$;

