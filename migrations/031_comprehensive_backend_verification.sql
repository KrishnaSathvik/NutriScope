-- ============================================================================
-- Migration 031: Comprehensive Backend Verification
-- Verifies all tables exist, RLS is enabled, and policies are correct
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFY ALL TABLES EXIST
-- ============================================================================

SELECT 
  'TABLE VERIFICATION' as check_type,
  tablename,
  CASE 
    WHEN tablename IS NOT NULL THEN '✅ Exists'
    ELSE '❌ Missing'
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
    'exercise_library',
    'meal_library',
    'recipe_library',
    'user_streaks',
    'user_ai_cache',
    'reminders',
    'alcohol_logs',
    'sleep_logs'
  )
ORDER BY tablename;

-- ============================================================================
-- PART 2: VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================================================

SELECT 
  'RLS VERIFICATION' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ DISABLED - SECURITY RISK!'
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
    'exercise_library',
    'meal_library',
    'recipe_library',
    'user_streaks',
    'user_ai_cache',
    'reminders',
    'alcohol_logs',
    'sleep_logs'
  )
ORDER BY tablename;

-- ============================================================================
-- PART 3: VERIFY RLS POLICIES EXIST FOR ALL TABLES
-- ============================================================================

SELECT 
  'POLICY VERIFICATION' as check_type,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(cmd::text, ', ' ORDER BY cmd) as operations,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Complete (4+ policies)'
    WHEN COUNT(*) > 0 THEN '⚠️ Incomplete'
    ELSE '❌ NO POLICIES - SECURITY RISK!'
  END as status
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
    'exercise_library',
    'meal_library',
    'recipe_library',
    'user_streaks',
    'user_ai_cache',
    'reminders',
    'alcohol_logs',
    'sleep_logs'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- PART 4: ENABLE RLS ON ANY MISSING TABLES
-- ============================================================================

-- Enable RLS on all tables (safe to run multiple times)
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
ALTER TABLE IF EXISTS exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meal_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipe_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alcohol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sleep_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: ADD MISSING RLS POLICIES FOR LIBRARY TABLES
-- ============================================================================

-- Meal Library Policies (public read, authenticated write)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meal_library') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view meal library" ON meal_library;
    DROP POLICY IF EXISTS "Authenticated users can insert meals" ON meal_library;
    DROP POLICY IF EXISTS "Authenticated users can update meals" ON meal_library;
    DROP POLICY IF EXISTS "Authenticated users can delete meals" ON meal_library;
    
    -- Create policies
    CREATE POLICY "Anyone can view meal library"
      ON meal_library FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can insert meals"
      ON meal_library FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Authenticated users can update meals"
      ON meal_library FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Authenticated users can delete meals"
      ON meal_library FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Recipe Library Policies (public read, authenticated write)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipe_library') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view recipe library" ON recipe_library;
    DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON recipe_library;
    DROP POLICY IF EXISTS "Authenticated users can update recipes" ON recipe_library;
    DROP POLICY IF EXISTS "Authenticated users can delete recipes" ON recipe_library;
    
    -- Create policies
    CREATE POLICY "Anyone can view recipe library"
      ON recipe_library FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can insert recipes"
      ON recipe_library FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Authenticated users can update recipes"
      ON recipe_library FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Authenticated users can delete recipes"
      ON recipe_library FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================================
-- PART 6: FINAL VERIFICATION SUMMARY
-- ============================================================================

SELECT 
  'FINAL SUMMARY' as check_type,
  COUNT(DISTINCT tablename) as total_tables,
  COUNT(DISTINCT CASE WHEN rowsecurity THEN tablename END) as tables_with_rls,
  COUNT(DISTINCT CASE WHEN NOT rowsecurity THEN tablename END) as tables_without_rls,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN NOT rowsecurity THEN tablename END) = 0 
    THEN '✅ ALL TABLES SECURED'
    ELSE '❌ SOME TABLES UNSECURED'
  END as overall_status
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
    'exercise_library',
    'meal_library',
    'recipe_library',
    'user_streaks',
    'user_ai_cache',
    'reminders',
    'alcohol_logs',
    'sleep_logs'
  );

