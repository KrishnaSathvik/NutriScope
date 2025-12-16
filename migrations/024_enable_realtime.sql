-- ============================================================================
-- Migration 024: Enable Supabase Realtime Replication
-- Enables realtime subscriptions for all tables that need realtime updates
-- ============================================================================

-- Enable replication for all tables that need realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE meals;
ALTER PUBLICATION supabase_realtime ADD TABLE exercises;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE weight_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE meal_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE meal_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE exercise_library;
ALTER PUBLICATION supabase_realtime ADD TABLE alcohol_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE sleep_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE reminders;

