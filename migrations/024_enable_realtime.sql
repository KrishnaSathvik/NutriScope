-- ============================================================================
-- Migration 024: Enable Supabase Realtime Replication
-- Enables realtime subscriptions for all tables that need realtime updates
-- This migration is idempotent - it will only add tables that aren't already in the publication
-- ============================================================================

-- Function to safely add tables to publication (only if not already added)
DO $$
DECLARE
    table_name TEXT;
    tables_to_add TEXT[] := ARRAY[
        'meals',
        'exercises',
        'daily_logs',
        'weight_logs',
        'recipes',
        'meal_plans',
        'grocery_lists',
        'chat_conversations',
        'achievements',
        'user_profiles',
        'meal_templates',
        'exercise_library',
        'alcohol_logs',
        'sleep_logs',
        'reminders',
        'user_streaks'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_add
    LOOP
        -- Check if table is already in publication
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = table_name
        ) THEN
            -- Add table to publication
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
            RAISE NOTICE 'Added table % to supabase_realtime publication', table_name;
        ELSE
            RAISE NOTICE 'Table % is already in supabase_realtime publication, skipping', table_name;
        END IF;
    END LOOP;
END $$;

