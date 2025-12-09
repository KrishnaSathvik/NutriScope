-- ============================================================================
-- COMPLETE SCHEMA STATUS REPORT
-- Run this to get a comprehensive status of your database schema
-- ============================================================================

-- ============================================================================
-- FINAL STATUS CHECK - All Critical Items
-- ============================================================================

WITH status_checks AS (
  -- Check 1: Redundant columns
  SELECT 
    '1. Redundant Columns' as check_item,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name IN ('user_id', 'target_calories', 'target_protein')
      ) THEN '❌ FAIL - Redundant columns exist'
      ELSE '✅ PASS - No redundant columns'
    END as status
  UNION ALL
  
  -- Check 2: user_profiles RLS policies use correct column
  SELECT 
    '2. user_profiles RLS Policies' as check_item,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND (qual LIKE '%user_id%' OR with_check LIKE '%user_id%')
        AND NOT (qual LIKE '%id OR user_id%' OR with_check LIKE '%id OR user_id%')
      ) THEN '❌ FAIL - Policies use user_id instead of id'
      WHEN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND (qual LIKE '%auth.uid() = id%' OR with_check LIKE '%auth.uid() = id%')
      ) THEN '✅ PASS - Policies use id correctly'
      ELSE '⚠️ WARNING - Check policies manually'
    END as status
  UNION ALL
  
  -- Check 3: Other tables RLS policies use user_id
  SELECT 
    '3. Other Tables RLS Policies' as check_item,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename IN ('meals', 'exercises', 'daily_logs', 'weight_logs', 'recipes', 'meal_plans', 'grocery_lists', 'achievements', 'chat_conversations', 'meal_templates')
        AND NOT (qual LIKE '%auth.uid() = user_id%' OR with_check LIKE '%auth.uid() = user_id%')
        AND cmd != 'SELECT'
      ) THEN '⚠️ WARNING - Some policies may not use user_id'
      ELSE '✅ PASS - All policies use user_id correctly'
    END as status
  UNION ALL
  
  -- Check 4: Unique constraint on daily_logs
  SELECT 
    '4. daily_logs Unique Constraint' as check_item,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'daily_logs'
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name IN ('user_id', 'date')
      ) THEN '✅ PASS - Unique constraint exists'
      ELSE '❌ FAIL - Missing unique constraint on (user_id, date)'
    END as status
  UNION ALL
  
  -- Check 5: Performance indexes exist
  SELECT 
    '5. Performance Indexes' as check_item,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename IN ('meals', 'exercises', 'daily_logs', 'weight_logs')
        AND indexname LIKE 'idx_%user_date%'
      ) THEN '✅ PASS - Performance indexes exist'
      ELSE '⚠️ WARNING - Some performance indexes may be missing'
    END as status
  UNION ALL
  
  -- Check 6: RLS enabled on all tables
  SELECT 
    '6. RLS Enabled' as check_item,
    CASE 
      WHEN (
        SELECT COUNT(*) FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('user_profiles', 'meals', 'exercises', 'daily_logs', 'weight_logs', 'recipes', 'meal_plans', 'grocery_lists', 'achievements', 'chat_conversations', 'meal_templates', 'exercise_library')
        AND rowsecurity = true
      ) = 12 THEN '✅ PASS - RLS enabled on all tables'
      ELSE '❌ FAIL - RLS not enabled on all tables'
    END as status
  UNION ALL
  
  -- Check 7: All tables have 4 policies
  SELECT 
    '7. Policy Count' as check_item,
    CASE 
      WHEN (
        SELECT COUNT(*) FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('user_profiles', 'meals', 'exercises', 'daily_logs', 'weight_logs', 'recipes', 'meal_plans', 'grocery_lists', 'achievements', 'chat_conversations', 'meal_templates')
        GROUP BY tablename
        HAVING COUNT(*) != 4
      ) IS NULL THEN '✅ PASS - All tables have 4 policies'
      ELSE '❌ FAIL - Some tables do not have 4 policies'
    END as status
)

SELECT 
  check_item,
  status,
  CASE 
    WHEN status LIKE '✅ PASS%' THEN 'GOOD'
    WHEN status LIKE '❌ FAIL%' THEN 'CRITICAL'
    WHEN status LIKE '⚠️ WARNING%' THEN 'MINOR'
    ELSE 'UNKNOWN'
  END as priority
FROM status_checks
ORDER BY 
  CASE 
    WHEN status LIKE '❌ FAIL%' THEN 1
    WHEN status LIKE '⚠️ WARNING%' THEN 2
    ELSE 3
  END,
  check_item;

-- ============================================================================
-- OVERALL STATUS SUMMARY
-- ============================================================================

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM (
        SELECT '1. Redundant Columns' as check_item
        WHERE EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND column_name IN ('user_id', 'target_calories', 'target_protein')
        )
        UNION ALL
        SELECT '2. user_profiles RLS Policies' as check_item
        WHERE EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'user_profiles' 
          AND (qual LIKE '%user_id%' OR with_check LIKE '%user_id%')
          AND NOT (qual LIKE '%id OR user_id%' OR with_check LIKE '%id OR user_id%')
        )
        UNION ALL
        SELECT '4. daily_logs Unique Constraint' as check_item
        WHERE NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'daily_logs'
          AND tc.constraint_type = 'UNIQUE'
          AND kcu.column_name IN ('user_id', 'date')
        )
      ) AS failed_checks
    ) = 0 THEN '🎉 PERFECT - All critical checks passed!'
    ELSE '⚠️ ISSUES FOUND - Review failed checks above'
  END as overall_status;

