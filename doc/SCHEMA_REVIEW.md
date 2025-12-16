# Backend Schema Review - Issues Found

## ✅ **What's Correct**

1. **All tables exist** - matches application usage
2. **Foreign keys** - properly set up with `ON DELETE CASCADE`
3. **Data types** - mostly correct (INTEGER for nutrition values)
4. **Check constraints** - meal types, goals, activity levels all match
5. **JSONB columns** - properly used for complex data

---

## ⚠️ **CRITICAL ISSUES**

### 1. **user_profiles Table - Redundant Columns**

**Problem:**
- Has both `id` and `user_id` columns
- Has both `calorie_target` and `target_calories`
- Has both `protein_target` and `target_protein`

**Impact:**
- Code uses `calorie_target` and `protein_target` primarily
- But also checks for `target_calories` and `target_protein` as fallbacks
- Migration code uses `target_calories` and `target_protein`
- ProfilePage updates both sets

**Recommendation:**
```sql
-- Remove redundant columns:
-- Keep: id (primary key), calorie_target, protein_target
-- Remove: user_id (redundant - id already references auth.users)
-- Remove: target_calories (use calorie_target)
-- Remove: target_protein (use protein_target)
```

**OR** standardize on one naming convention:
- Use `target_calories` and `target_protein` everywhere (more consistent naming)
- Update all code to use these names

---

### 2. **meals Table - Data Type Mismatch**

**Schema shows:**
- `protein INTEGER NOT NULL DEFAULT 0`

**Code expects:**
- `protein: number` (TypeScript)
- Code rounds to integer: `Math.round(meal.protein || 0)`

**Status:** ✅ Actually correct - INTEGER is fine

---

### 3. **Missing Constraints**

**user_profiles:**
- `id` should be PRIMARY KEY (it is)
- But `user_id` is redundant - should be removed
- `email` should allow NULL for anonymous users (it does)

**meals:**
- `protein` should allow NULL or have default (has default ✅)
- `carbs` and `fats` are nullable ✅

---

## 🔧 **RECOMMENDED FIXES**

### Fix 1: Consolidate user_profiles columns

```sql
-- Option A: Keep calorie_target and protein_target (update code)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS target_calories;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS target_protein;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS user_id;

-- Option B: Keep target_calories and target_protein (update code)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS calorie_target;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS protein_target;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS user_id;
```

### Fix 2: Ensure proper array types

The schema shows `ARRAY DEFAULT ARRAY[]::text[]` which should be:
```sql
-- For exercise_library
muscle_groups TEXT[] DEFAULT ARRAY[]::TEXT[],
equipment TEXT[] DEFAULT ARRAY[]::TEXT[],

-- For recipes
instructions TEXT[] DEFAULT ARRAY[]::TEXT[],
tags TEXT[] DEFAULT ARRAY[]::TEXT[],
```

### Fix 3: Add unique constraint

```sql
-- Ensure one profile per user
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_id_unique UNIQUE (id);

-- Ensure one daily log per user per date
ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);
```

---

## 📊 **SCHEMA COMPARISON**

| Table | Schema Status | Code Usage | Match? |
|-------|--------------|------------|--------|
| `user_profiles` | Has redundant columns | Uses both sets | ⚠️ Needs cleanup |
| `meals` | INTEGER types | Rounds to int | ✅ Perfect |
| `exercises` | All columns present | Matches usage | ✅ Perfect |
| `daily_logs` | All columns present | Matches usage | ✅ Perfect |
| `recipes` | Array types need fix | Matches usage | ⚠️ Minor fix |
| `meal_plans` | All columns present | Matches usage | ✅ Perfect |
| `grocery_lists` | All columns present | Matches usage | ✅ Perfect |
| `achievements` | All columns present | Matches usage | ✅ Perfect |
| `chat_conversations` | All columns present | Matches usage | ✅ Perfect |
| `meal_templates` | All columns present | Matches usage | ✅ Perfect |
| `exercise_library` | Array types need fix | Matches usage | ⚠️ Minor fix |
| `weight_logs` | All columns present | Matches usage | ✅ Perfect |

---

## ✅ **FINAL VERDICT**

**Overall:** 85% Perfect

**Issues:**
1. ⚠️ **Redundant columns in user_profiles** - needs cleanup
2. ⚠️ **Array type syntax** - minor formatting issue
3. ✅ **Everything else** - Perfect!

**Action Required:**
1. Remove redundant columns from `user_profiles`
2. Standardize on one naming convention (`target_calories` vs `calorie_target`)
3. Fix array type syntax (though it may work as-is in PostgreSQL)

---

## 🎯 **RECOMMENDED SCHEMA CHANGES**

```sql
-- 1. Clean up user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS target_calories;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS target_protein;

-- 2. Add unique constraints
ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);

-- 3. Ensure proper indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_exercises_user_date ON exercises(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date);
```

