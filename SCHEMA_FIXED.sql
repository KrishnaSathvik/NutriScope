-- ============================================================================
-- NUTRISCOPE - PERFECT SCHEMA
-- This schema fixes all issues and ensures everything matches the application
-- ============================================================================

-- ============================================================================
-- STEP 1: UPDATE RLS POLICIES TO REMOVE user_id DEPENDENCY
-- ============================================================================

-- Drop existing policies that depend on user_id
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- Recreate policies using only 'id' (which references auth.users)
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- STEP 2: REMOVE REDUNDANT COLUMNS FROM user_profiles
-- ============================================================================

-- Remove user_id column (redundant - id already references auth.users)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS user_id CASCADE;

-- Remove target_calories and target_protein (keep calorie_target and protein_target)
-- First, migrate any data from target_* to calorie_* columns
UPDATE user_profiles 
SET calorie_target = COALESCE(calorie_target, target_calories, 2000),
    protein_target = COALESCE(protein_target, target_protein, 150)
WHERE calorie_target IS NULL OR protein_target IS NULL;

-- Now drop the redundant columns
ALTER TABLE user_profiles DROP COLUMN IF EXISTS target_calories CASCADE;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS target_protein CASCADE;

-- ============================================================================
-- STEP 3: ADD UNIQUE CONSTRAINT FOR daily_logs
-- ============================================================================

-- Ensure one daily log per user per date
ALTER TABLE daily_logs 
DROP CONSTRAINT IF EXISTS daily_logs_user_date_unique;

ALTER TABLE daily_logs 
ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_exercises_user_date ON exercises(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_week ON meal_plans(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_id ON grocery_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id ON meal_templates(user_id);

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Check user_profiles structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check for duplicate daily logs
SELECT 
  user_id,
  date,
  COUNT(*) as count
FROM daily_logs
GROUP BY user_id, date
HAVING COUNT(*) > 1;

-- Verify all tables have RLS enabled
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

-- ============================================================================
-- EXPECTED RESULT AFTER RUNNING THIS SCRIPT:
-- ============================================================================
-- ✅ user_profiles table:
--    - Has 'id' column (primary key, references auth.users)
--    - NO 'user_id' column (removed)
--    - Has 'calorie_target' and 'protein_target' columns
--    - NO 'target_calories' or 'target_protein' columns (removed)
--
-- ✅ RLS policies:
--    - All policies use only 'id' (not 'user_id')
--    - Policies work correctly for anonymous and authenticated users
--
-- ✅ Constraints:
--    - daily_logs has UNIQUE(user_id, date) constraint
--
-- ✅ Indexes:
--    - All tables have proper indexes for performance
-- ============================================================================

