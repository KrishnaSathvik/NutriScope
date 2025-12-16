# Database Migrations Summary

## ✅ All SQL Files Converted to Migrations

All SQL schema files have been converted to numbered migration files in the `migrations/` directory.

---

## 📋 Migration Files (In Order)

### **Existing Migrations** (001-014)
- `001_add_preferences_column.sql` - User preferences migration
- `002_add_gender_column.sql` - Gender column for BMR calculation
- `002_create_user_streaks.sql` - Streak data storage
- `003_add_unit_system_column.sql` - Unit system preference
- `003_create_user_ai_cache.sql` - AI cache storage
- `004_add_more_exercises.sql` - Additional exercises
- `005_create_meal_library.sql` - Meal library table
- `006_populate_meal_library.sql` - Meal library data
- `007_create_recipe_library.sql` - Recipe library table
- `008_populate_recipe_library.sql` - Recipe library data
- `009_create_achievements_table.sql` - Achievements table
- `010_add_goals_array_column.sql` - Multiple goals support
- `011_add_target_weight_timeframe.sql` - Target weight tracking
- `012_reset_onboarding_for_user.sql` - Onboarding reset utility
- `013_add_onboarding_completed_flag.sql` - Onboarding completion flag
- `014_reset_onboarding_krishna.sql` - User-specific onboarding reset

### **New Migrations** (015-027)

#### **015_create_exercise_library.sql**
- Creates `exercise_library` table
- Adds MET values for calorie calculations
- Public read access, authenticated write
- Function: `calculate_calories_from_mets()`

#### **016_populate_exercise_library.sql**
- Populates exercise library with 150+ exercises
- Includes cardio, strength, yoga, sports exercises
- All exercises have MET values for accurate calorie calculations

#### **017_create_weight_tracking.sql**
- Creates `weight_logs` table
- Functions: `calculate_bmi()`, `get_bmi_category()`, `get_latest_weight()`, `get_weight_change()`
- Supports body fat percentage and muscle mass tracking

#### **018_create_reminders_table.sql**
- Creates `reminders` table for scheduled notifications
- Function: `get_upcoming_reminders()` for service worker
- Supports all reminder types: meal, water, workout, goal, streak, weight, summary

#### **019_create_alcohol_tracking.sql**
- Creates `alcohol_logs` table
- Adds `alcohol_drinks` column to `daily_logs`
- Function: `calculate_standard_drinks()`

#### **020_create_sleep_tracking.sql**
- Creates `sleep_logs` table
- Adds `sleep_hours` column to `daily_logs`
- Function: `calculate_sleep_duration()`

#### **021_create_meal_plans.sql**
- Creates `meal_plans` table for weekly meal planning
- Stores planned meals as JSONB

#### **022_create_grocery_items.sql**
- Creates `grocery_items` table for autocomplete/search
- Populates with common grocery items
- Function: `increment_grocery_item_search_count()`

#### **023_add_name_column_to_meals.sql**
- Adds optional `name` column to `meals` table
- Allows better meal identification

#### **024_enable_realtime.sql**
- Enables Supabase realtime replication for all tables
- Required for real-time updates across pages

#### **025_update_reminder_settings_schema.sql**
- Updates `reminder_settings` default value
- Adds new reminder types: weight, streak, summary
- Backward compatible with existing users

#### **026_create_recipes_table.sql**
- Creates `recipes` table for user recipe management
- Supports ingredients, instructions, nutrition data

#### **027_create_grocery_lists_table.sql**
- Creates `grocery_lists` table for shopping lists
- Links to meal plans via `week_start_date`

---

## 🗂️ Files Not Migrated (Keep as-is)

These files are utility/verification scripts and should remain in the root directory:

- `verify_database.sql` - Database verification script
- `rls_policies_verification.sql` - RLS policy verification
- `rls_policies_cleanup.sql` - RLS cleanup utility
- `SCHEMA_*.sql` - Schema verification/report files
- `supabase_schema.sql` - Main database schema (base schema)
- `supabase/schema.sql` - Supabase CLI schema file

---

## 🚀 How to Run Migrations

### **Option 1: Run in Supabase Dashboard**
1. Open Supabase Dashboard → SQL Editor
2. Run migrations in order (001 → 027)
3. Each migration is idempotent (safe to run multiple times)

### **Option 2: Using Supabase CLI**
```bash
# Apply all migrations
supabase db push

# Or run specific migration
supabase db execute migrations/015_create_exercise_library.sql
```

---

## 📊 Migration Dependencies

**Base Schema Required First:**
- Run `supabase_schema.sql` first (main schema)

**Then Run Migrations in Order:**
- 001-014: Existing migrations
- 015-027: New migrations (can be run in any order, but recommended sequentially)

**Special Notes:**
- Migration 016 should run after 015 (populates exercise library)
- Migration 024 should run after all tables are created (enables realtime)

---

## ✅ Migration Status

- ✅ **15 new migrations created** (015-027)
- ✅ **All SQL files converted** to proper migration format
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Properly numbered** - Sequential ordering
- ✅ **Documented** - Each migration has clear comments

---

## 📝 Next Steps

1. **Review migrations** - Check each migration file
2. **Test in development** - Run migrations in dev environment first
3. **Apply to production** - Run migrations in production Supabase instance
4. **Archive old SQL files** - Consider moving old SQL files to `archive/` folder

---

**Migration Conversion Date**: $(date)
**Total Migrations**: 27 (14 existing + 13 new)

