-- ============================================================================
-- NUTRISCOPE - COMPLETE PERFECT SCHEMA
-- This is the complete schema that matches your application perfectly
-- Run this to verify your database structure matches expectations
-- ============================================================================

-- ============================================================================
-- VERIFICATION: Check Current Schema Structure
-- ============================================================================

-- 1. Check user_profiles columns
SELECT 
  'user_profiles' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Check all table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
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
ORDER BY table_name, ordinal_position;

-- 3. Check foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 4. Check unique constraints
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 5. Check indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
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
ORDER BY tablename, indexname;

-- 6. Check RLS status
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

-- 7. Check RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN qual
    ELSE 'N/A'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check
    ELSE 'N/A'
  END as with_check_clause
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
ORDER BY tablename, policyname;

-- 8. Count policies per table
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

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- user_profiles:
--   ✅ Should have: id, email, name, age, weight, height, goal, activity_level,
--      dietary_preference, calorie_target, protein_target, target_carbs, target_fats,
--      water_goal, restrictions, reminder_enabled, reminder_settings, created_at, updated_at
--   ❌ Should NOT have: user_id, target_calories, target_protein
--
-- RLS Policies:
--   ✅ user_profiles policies should use: auth.uid() = id (NOT user_id)
--   ✅ All other tables should use: auth.uid() = user_id
--   ✅ Each table should have 4 policies: SELECT, INSERT, UPDATE, DELETE
--
-- Constraints:
--   ✅ daily_logs should have UNIQUE(user_id, date)
--   ✅ All foreign keys should reference auth.users(id) ON DELETE CASCADE
--
-- Indexes:
--   ✅ Should have indexes on (user_id, date) for meals, exercises, daily_logs, weight_logs
--   ✅ Should have indexes on user_id for other tables
-- ============================================================================

