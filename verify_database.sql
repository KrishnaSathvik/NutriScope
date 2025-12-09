-- ============================================================================
-- NUTRISCOPE DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify database setup
-- ============================================================================

-- ============================================================================
-- 1. CHECK TABLES EXIST
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('user_profiles', 'meals', 'exercises', 'daily_logs', 'meal_templates', 'chat_conversations');
    
    IF table_count = 6 THEN
        RAISE NOTICE '✅ All 6 required tables exist';
    ELSE
        RAISE WARNING '⚠️  Only % out of 6 tables found', table_count;
    END IF;
END $$;

-- ============================================================================
-- 2. CHECK RLS IS ENABLED
-- ============================================================================

DO $$
DECLARE
    rls_enabled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('user_profiles', 'meals', 'exercises', 'daily_logs', 'meal_templates', 'chat_conversations')
    AND rowsecurity = true;
    
    IF rls_enabled_count = 6 THEN
        RAISE NOTICE '✅ RLS enabled on all tables';
    ELSE
        RAISE WARNING '⚠️  RLS enabled on only % out of 6 tables', rls_enabled_count;
    END IF;
END $$;

-- ============================================================================
-- 3. CHECK RLS POLICIES EXIST
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('user_profiles', 'meals', 'exercises', 'daily_logs', 'meal_templates', 'chat_conversations');
    
    IF policy_count >= 18 THEN
        RAISE NOTICE '✅ Found % RLS policies (expected at least 18)', policy_count;
    ELSE
        RAISE WARNING '⚠️  Found only % RLS policies (expected at least 18)', policy_count;
    END IF;
END $$;

-- ============================================================================
-- 4. CHECK REMINDER_SETTINGS STRUCTURE
-- ============================================================================

DO $$
DECLARE
    has_weight INTEGER;
    has_streak INTEGER;
    has_summary INTEGER;
    total_profiles INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM user_profiles WHERE reminder_settings IS NOT NULL;
    
    SELECT COUNT(*) INTO has_weight
    FROM user_profiles
    WHERE reminder_settings->'weight_reminders' IS NOT NULL;
    
    SELECT COUNT(*) INTO has_streak
    FROM user_profiles
    WHERE reminder_settings->'streak_reminders' IS NOT NULL;
    
    SELECT COUNT(*) INTO has_summary
    FROM user_profiles
    WHERE reminder_settings->'summary_reminders' IS NOT NULL;
    
    RAISE NOTICE '📊 Reminder Settings Status:';
    RAISE NOTICE '   Total profiles: %', total_profiles;
    RAISE NOTICE '   Has weight_reminders: %', has_weight;
    RAISE NOTICE '   Has streak_reminders: %', has_streak;
    RAISE NOTICE '   Has summary_reminders: %', has_summary;
    
    IF has_weight = total_profiles AND has_streak = total_profiles AND has_summary = total_profiles THEN
        RAISE NOTICE '✅ All profiles have new reminder types';
    ELSIF total_profiles > 0 THEN
        RAISE WARNING '⚠️  Some profiles missing new reminder types. Run migration script.';
    END IF;
END $$;

-- ============================================================================
-- 5. CHECK STORAGE BUCKET
-- ============================================================================

DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM storage.buckets WHERE id = 'chat-images'
    ) INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE '✅ Storage bucket "chat-images" exists';
    ELSE
        RAISE WARNING '⚠️  Storage bucket "chat-images" missing';
    END IF;
END $$;

-- ============================================================================
-- 6. CHECK INDEXES
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('user_profiles', 'meals', 'exercises', 'daily_logs', 'meal_templates', 'chat_conversations')
    AND indexname LIKE 'idx_%';
    
    IF index_count >= 15 THEN
        RAISE NOTICE '✅ Found % indexes (expected at least 15)', index_count;
    ELSE
        RAISE WARNING '⚠️  Found only % indexes (expected at least 15)', index_count;
    END IF;
END $$;

-- ============================================================================
-- 7. CHECK FUNCTIONS
-- ============================================================================

DO $$
DECLARE
    function_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_proc
        WHERE proname = 'get_daily_summary'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ Helper function "get_daily_summary" exists';
    ELSE
        RAISE WARNING '⚠️  Helper function "get_daily_summary" missing';
    END IF;
END $$;

-- ============================================================================
-- 8. CHECK TRIGGERS
-- ============================================================================

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname LIKE 'update_%_updated_at'
    AND tgenabled = 'O';
    
    IF trigger_count >= 6 THEN
        RAISE NOTICE '✅ Found % updated_at triggers (expected at least 6)', trigger_count;
    ELSE
        RAISE WARNING '⚠️  Found only % updated_at triggers (expected at least 6)', trigger_count;
    END IF;
END $$;

-- ============================================================================
-- 9. CHECK DEFAULT VALUES
-- ============================================================================

DO $$
DECLARE
    default_value TEXT;
BEGIN
    SELECT column_default INTO default_value
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'reminder_settings';
    
    IF default_value IS NOT NULL THEN
        IF default_value LIKE '%weight_reminders%' THEN
            RAISE NOTICE '✅ reminder_settings default includes new reminder types';
        ELSE
            RAISE WARNING '⚠️  reminder_settings default missing new reminder types';
        END IF;
    ELSE
        RAISE WARNING '⚠️  reminder_settings has no default value';
    END IF;
END $$;

-- ============================================================================
-- 10. SAMPLE DATA CHECK (Optional)
-- ============================================================================

DO $$
DECLARE
    user_count INTEGER;
    meal_count INTEGER;
    exercise_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM user_profiles;
    SELECT COUNT(*) INTO meal_count FROM meals;
    SELECT COUNT(*) INTO exercise_count FROM exercises;
    
    RAISE NOTICE '📊 Sample Data:';
    RAISE NOTICE '   User profiles: %', user_count;
    RAISE NOTICE '   Meals: %', meal_count;
    RAISE NOTICE '   Exercises: %', exercise_count;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Database verification complete!';
    RAISE NOTICE 'Review the notices above for any warnings.';
    RAISE NOTICE '========================================';
END $$;

