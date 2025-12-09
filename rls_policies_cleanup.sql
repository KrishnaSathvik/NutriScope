-- ============================================================================
-- RLS POLICIES CLEANUP SCRIPT
-- Removes duplicate policies and keeps only the standardized ones
-- Run this AFTER rls_policies_verification.sql if you see duplicate policies
-- ============================================================================

-- Remove duplicate policies for chat_conversations
-- Keep: "Users can [action] own chat conversations"
-- Remove: "Users can [action] own conversations"
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON chat_conversations;

-- Remove duplicate policies for grocery_lists
-- Keep: "Users can [action] own grocery lists"
-- Remove: "Users can [action] own grocery_lists"
DROP POLICY IF EXISTS "Users can view own grocery_lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can insert own grocery_lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can update own grocery_lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can delete own grocery_lists" ON grocery_lists;

-- Remove duplicate policies for meal_plans
-- Keep: "Users can [action] own meal plans"
-- Remove: "Users can [action] own meal_plans"
DROP POLICY IF EXISTS "Users can view own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update own meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal_plans" ON meal_plans;

-- ============================================================================
-- VERIFICATION - Check policy counts after cleanup
-- ============================================================================

-- Count policies per table (should all be 4 now)
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

-- Expected result: All tables should have exactly 4 policies
-- user_profiles: 4
-- meals: 4
-- exercises: 4
-- daily_logs: 4
-- weight_logs: 4
-- recipes: 4
-- meal_plans: 4 (was 8, now 4)
-- grocery_lists: 4 (was 8, now 4)
-- achievements: 4
-- chat_conversations: 4 (was 8, now 4)
-- meal_templates: 4
-- exercise_library: 4

