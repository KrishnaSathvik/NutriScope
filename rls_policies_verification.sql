-- ============================================================================
-- RLS POLICIES VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify Row Level Security is enabled
-- and policies are correctly configured for all tables
-- ============================================================================

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'meals',
    'exercises',
    'daily_logs',
    'weight_logs',
    'recipes',
    'meal_plans',
    'grocery_lists',
    'achievements',
    'chat_conversations',
    'meal_templates'
  )
ORDER BY tablename;

-- Check existing policies for each table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'meals',
    'exercises',
    'daily_logs',
    'weight_logs',
    'recipes',
    'meal_plans',
    'grocery_lists',
    'achievements',
    'chat_conversations',
    'meal_templates'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES (if not already enabled)
-- ============================================================================

ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meal_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES FOR ALL TABLES
-- These policies ensure users can only access their own data
-- ============================================================================

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = id OR auth.uid() = user_id);

-- Meals Policies
DROP POLICY IF EXISTS "Users can view own meals" ON meals;
CREATE POLICY "Users can view own meals"
  ON meals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meals" ON meals;
CREATE POLICY "Users can insert own meals"
  ON meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meals" ON meals;
CREATE POLICY "Users can update own meals"
  ON meals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meals" ON meals;
CREATE POLICY "Users can delete own meals"
  ON meals FOR DELETE
  USING (auth.uid() = user_id);

-- Exercises Policies
DROP POLICY IF EXISTS "Users can view own exercises" ON exercises;
CREATE POLICY "Users can view own exercises"
  ON exercises FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own exercises" ON exercises;
CREATE POLICY "Users can insert own exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own exercises" ON exercises;
CREATE POLICY "Users can update own exercises"
  ON exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own exercises" ON exercises;
CREATE POLICY "Users can delete own exercises"
  ON exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Logs Policies
DROP POLICY IF EXISTS "Users can view own daily logs" ON daily_logs;
CREATE POLICY "Users can view own daily logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily logs" ON daily_logs;
CREATE POLICY "Users can insert own daily logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily logs" ON daily_logs;
CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily logs" ON daily_logs;
CREATE POLICY "Users can delete own daily logs"
  ON daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Weight Logs Policies
DROP POLICY IF EXISTS "Users can view own weight logs" ON weight_logs;
CREATE POLICY "Users can view own weight logs"
  ON weight_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weight logs" ON weight_logs;
CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own weight logs" ON weight_logs;
CREATE POLICY "Users can update own weight logs"
  ON weight_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own weight logs" ON weight_logs;
CREATE POLICY "Users can delete own weight logs"
  ON weight_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Recipes Policies
DROP POLICY IF EXISTS "Users can view own recipes" ON recipes;
CREATE POLICY "Users can view own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Meal Plans Policies
-- Remove any existing policies first (including duplicates with different names)
DROP POLICY IF EXISTS "Users can view own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can view own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal_plans" ON meal_plans;

CREATE POLICY "Users can view own meal plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Grocery Lists Policies
-- Remove any existing policies first (including duplicates with different names)
DROP POLICY IF EXISTS "Users can view own grocery lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can view own grocery_lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can insert own grocery lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can insert own grocery_lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can update own grocery lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can update own grocery_lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can delete own grocery lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can delete own grocery_lists" ON grocery_lists;

CREATE POLICY "Users can view own grocery lists"
  ON grocery_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grocery lists"
  ON grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grocery lists"
  ON grocery_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own grocery lists"
  ON grocery_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Achievements Policies
DROP POLICY IF EXISTS "Users can view own achievements" ON achievements;
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON achievements;
CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own achievements" ON achievements;
CREATE POLICY "Users can update own achievements"
  ON achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own achievements" ON achievements;
CREATE POLICY "Users can delete own achievements"
  ON achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Conversations Policies
-- Remove any existing policies first (including duplicates with different names)
DROP POLICY IF EXISTS "Users can view own chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can insert own chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update own chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can delete own chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON chat_conversations;

CREATE POLICY "Users can view own chat conversations"
  ON chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat conversations"
  ON chat_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat conversations"
  ON chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Meal Templates Policies
DROP POLICY IF EXISTS "Users can view own meal templates" ON meal_templates;
CREATE POLICY "Users can view own meal templates"
  ON meal_templates FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meal templates" ON meal_templates;
CREATE POLICY "Users can insert own meal templates"
  ON meal_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meal templates" ON meal_templates;
CREATE POLICY "Users can update own meal templates"
  ON meal_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meal templates" ON meal_templates;
CREATE POLICY "Users can delete own meal templates"
  ON meal_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- EXERCISE LIBRARY POLICIES (Public read, authenticated insert/update/delete)
-- ============================================================================

-- Enable RLS on exercise_library if it exists
ALTER TABLE IF EXISTS exercise_library ENABLE ROW LEVEL SECURITY;

-- Public read access for exercise library (all users can view)
DROP POLICY IF EXISTS "Anyone can view exercise library" ON exercise_library;
CREATE POLICY "Anyone can view exercise library"
  ON exercise_library FOR SELECT
  USING (true);

-- Only authenticated users can insert/update/delete (optional - adjust based on your needs)
-- If you want only admins to modify, remove these policies
DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON exercise_library;
CREATE POLICY "Authenticated users can insert exercises"
  ON exercise_library FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update exercises" ON exercise_library;
CREATE POLICY "Authenticated users can update exercises"
  ON exercise_library FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete exercises" ON exercise_library;
CREATE POLICY "Authenticated users can delete exercises"
  ON exercise_library FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- VERIFICATION QUERIES (Run after creating policies)
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'meals',
    'exercises',
    'daily_logs',
    'weight_logs',
    'recipes',
    'meal_plans',
    'grocery_lists',
    'achievements',
    'chat_conversations',
    'meal_templates',
    'exercise_library'
  )
ORDER BY tablename;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'meals',
    'exercises',
    'daily_logs',
    'weight_logs',
    'recipes',
    'meal_plans',
    'grocery_lists',
    'achievements',
    'chat_conversations',
    'meal_templates',
    'exercise_library'
  )
GROUP BY tablename
ORDER BY tablename;

-- Expected policy counts:
-- user_profiles: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- meals: 4 policies
-- exercises: 4 policies
-- daily_logs: 4 policies
-- weight_logs: 4 policies
-- recipes: 4 policies
-- meal_plans: 4 policies
-- grocery_lists: 4 policies
-- achievements: 4 policies
-- chat_conversations: 4 policies
-- meal_templates: 4 policies
-- exercise_library: 4 policies (or adjust based on your needs)

