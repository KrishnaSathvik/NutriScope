-- ============================================================================
-- FINAL VERIFICATION - Check if everything is PERFECT
-- Run this after SCHEMA_FIXED.sql to verify all fixes are applied
-- ============================================================================

-- ============================================================================
-- 1. CHECK user_profiles COLUMNS (Should NOT have redundant columns)
-- ============================================================================

SELECT 
  'user_profiles columns check' as check_type,
  column_name,
  CASE 
    WHEN column_name = 'user_id' THEN '❌ REDUNDANT - Should be removed'
    WHEN column_name = 'target_calories' THEN '❌ REDUNDANT - Should be removed'
    WHEN column_name = 'target_protein' THEN '❌ REDUNDANT - Should be removed'
    WHEN column_name = 'id' THEN '✅ CORRECT - Primary key'
    WHEN column_name = 'calorie_target' THEN '✅ CORRECT - Keep this'
    WHEN column_name = 'protein_target' THEN '✅ CORRECT - Keep this'
    ELSE '✅ OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CHECK user_profiles RLS POLICIES (Should use 'id', NOT 'user_id')
-- ============================================================================

SELECT 
  'user_profiles RLS policies' as check_type,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%user_id%' THEN '❌ WRONG - Should use id, not user_id'
    WHEN qual LIKE '%auth.uid() = id%' OR qual LIKE '%id OR%' THEN '✅ CORRECT - Uses id'
    WHEN qual IS NULL AND with_check LIKE '%auth.uid() = id%' THEN '✅ CORRECT - Uses id'
    ELSE '⚠️ CHECK MANUALLY'
  END as status,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================================================
-- 3. CHECK OTHER TABLES RLS POLICIES (Should use 'user_id')
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid() = user_id%' OR with_check LIKE '%auth.uid() = user_id%' THEN '✅ CORRECT'
    WHEN tablename = 'exercise_library' AND qual = 'true' THEN '✅ CORRECT - Public read'
    ELSE '⚠️ CHECK MANUALLY'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
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

-- ============================================================================
-- 4. CHECK UNIQUE CONSTRAINTS
-- ============================================================================

SELECT 
  'Unique constraints check' as check_type,
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  CASE 
    WHEN tc.table_name = 'daily_logs' AND kcu.column_name IN ('user_id', 'date') THEN '✅ CORRECT - Should have unique(user_id, date)'
    WHEN tc.table_name = 'user_profiles' AND kcu.column_name = 'id' THEN '✅ CORRECT - Primary key'
    ELSE '✅ OK'
  END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'user_profiles',
    'daily_logs'
  )
ORDER BY tc.table_name, kcu.ordinal_position;

-- ============================================================================
-- 5. CHECK INDEXES
-- ============================================================================

SELECT 
  'Indexes check' as check_type,
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE 'idx_%' THEN '✅ CORRECT - Performance index'
    WHEN indexname LIKE '%_pkey' THEN '✅ CORRECT - Primary key index'
    WHEN indexname LIKE '%_user_date_unique' THEN '✅ CORRECT - Unique constraint index'
    ELSE '✅ OK'
  END as status
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
    'meal_templates'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 6. SUMMARY CHECK
-- ============================================================================

SELECT 
  'SUMMARY' as check_type,
  'All checks complete' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name IN ('user_id', 'target_calories', 'target_protein')
    ) THEN '❌ ISSUES FOUND - Run SCHEMA_FIXED.sql'
    ELSE '✅ PERFECT - No redundant columns found'
  END as result;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- 1. user_profiles columns:
--    ✅ Should NOT have: user_id, target_calories, target_protein
--    ✅ Should have: id, calorie_target, protein_target
--
-- 2. user_profiles RLS policies:
--    ✅ Should use: auth.uid() = id (NOT user_id)
--
-- 3. Other tables RLS policies:
--    ✅ Should use: auth.uid() = user_id
--
-- 4. Unique constraints:
--    ✅ daily_logs should have: UNIQUE(user_id, date)
--
-- 5. Indexes:
--    ✅ Should have performance indexes on (user_id, date) for main tables
-- ============================================================================

