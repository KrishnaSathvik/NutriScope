# Database Migration Guide

## 📋 Quick Reference

All SQL schema files have been converted to numbered migrations in the `migrations/` directory.

---

## 🎯 Migration Order

Run migrations in this exact order:

### **Phase 1: Base Schema** (Required First)
1. `supabase_schema.sql` - Main database schema (run this first!)

### **Phase 2: Existing Migrations** (001-014)
2. `migrations/001_add_preferences_column.sql`
3. `migrations/002_add_gender_column.sql` OR `002_create_user_streaks.sql`
4. `migrations/003_add_unit_system_column.sql` OR `003_create_user_ai_cache.sql`
5. `migrations/004_add_more_exercises.sql`
6. `migrations/005_create_meal_library.sql`
7. `migrations/006_populate_meal_library.sql`
8. `migrations/007_create_recipe_library.sql`
9. `migrations/008_populate_recipe_library.sql`
10. `migrations/009_create_achievements_table.sql`
11. `migrations/010_add_goals_array_column.sql`
12. `migrations/011_add_target_weight_timeframe.sql`
13. `migrations/012_reset_onboarding_for_user.sql` (optional - utility)
14. `migrations/013_add_onboarding_completed_flag.sql`
15. `migrations/014_reset_onboarding_krishna.sql` (optional - user-specific)

### **Phase 3: Feature Migrations** (015-027)
16. `migrations/015_create_exercise_library.sql`
17. `migrations/016_populate_exercise_library.sql` (run after 015)
18. `migrations/017_create_weight_tracking.sql`
19. `migrations/018_create_reminders_table.sql`
20. `migrations/019_create_alcohol_tracking.sql`
21. `migrations/020_create_sleep_tracking.sql`
22. `migrations/021_create_meal_plans.sql`
23. `migrations/022_create_grocery_items.sql`
24. `migrations/023_add_name_column_to_meals.sql`
25. `migrations/024_enable_realtime.sql` (run after all tables created)
26. `migrations/025_update_reminder_settings_schema.sql`
27. `migrations/026_create_recipes_table.sql`
28. `migrations/027_create_grocery_lists_table.sql`

---

## ✅ Migration Checklist

- [ ] Run `supabase_schema.sql` first
- [ ] Run migrations 001-014 (existing migrations)
- [ ] Run migrations 015-027 (new feature migrations)
- [ ] Verify all tables created successfully
- [ ] Verify RLS policies are enabled
- [ ] Test realtime subscriptions (migration 024)

---

## 🔍 Verification

After running migrations, verify with:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check realtime replication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 📁 File Organization

### **Migrations Directory** (`migrations/`)
- ✅ All numbered migration files (001-027)
- ✅ Sequential ordering
- ✅ Idempotent (safe to run multiple times)

### **Root Directory** (Keep as-is)
- `supabase_schema.sql` - Main schema (run first)
- `verify_database.sql` - Verification script
- `rls_policies_verification.sql` - RLS verification
- `SCHEMA_*.sql` - Schema reports

### **Archive** (Consider moving)
- `exercise_library_schema.sql` → Migrated to 015
- `exercise_library_data.sql` → Migrated to 016
- `weight_tracking_schema.sql` → Migrated to 017
- `reminders_schema.sql` → Migrated to 018
- `alcohol_tracking_schema.sql` → Migrated to 019
- `sleep_tracking_schema.sql` → Migrated to 020
- `add_meal_plans_schema.sql` → Migrated to 021
- `add_grocery_items_schema.sql` → Migrated to 022
- `add_name_column_to_meals.sql` → Migrated to 023
- `enable_realtime.sql` → Migrated to 024
- `update_reminder_settings_schema_fixed.sql` → Migrated to 025
- `achievements_recipes_schema.sql` → Migrated to 026, 027

---

## 🎉 Benefits

✅ **Organized** - All migrations in one directory
✅ **Sequential** - Clear ordering with numbers
✅ **Idempotent** - Safe to run multiple times
✅ **Documented** - Each migration has clear purpose
✅ **Version Controlled** - Easy to track changes

---

**Last Updated**: $(date)

