# Guest Data Migration & RLS Policy Fixes

## ✅ Changes Made

### 1. **Complete Guest Data Migration** ✅

**File:** `src/services/migrateGuestData.ts`

**Added migrations for missing tables:**
- ✅ Weight Logs (step 7)
- ✅ Recipes (step 8)
- ✅ Meal Plans (step 9)
- ✅ Grocery Lists (step 10)
- ✅ Achievements (step 11)

**Updated:**
- Total migration steps: 6 → 11
- All progress indicators updated accordingly

**Migration Flow:**
1. User Profile
2. Chat Conversations
3. Meals
4. Exercises/Workouts
5. Daily Logs
6. Meal Templates
7. **Weight Logs** (NEW)
8. **Recipes** (NEW)
9. **Meal Plans** (NEW)
10. **Grocery Lists** (NEW)
11. **Achievements** (NEW)

### 2. **RLS Policy Verification Script** ✅

**File:** `rls_policies_verification.sql`

**Features:**
- ✅ Checks if RLS is enabled on all tables
- ✅ Lists existing policies
- ✅ Enables RLS on all tables (if not already enabled)
- ✅ Creates comprehensive policies for all tables:
  - `user_profiles`
  - `meals`
  - `exercises`
  - `daily_logs`
  - `weight_logs`
  - `recipes`
  - `meal_plans`
  - `grocery_lists`
  - `achievements`
  - `chat_conversations`
  - `meal_templates`
  - `exercise_library` (public read, authenticated write)

**Policy Types Created:**
- SELECT: Users can view their own data
- INSERT: Users can insert their own data
- UPDATE: Users can update their own data
- DELETE: Users can delete their own data

**Verification Queries:**
- Shows RLS status for all tables
- Counts policies per table
- Lists all policies with details

---

## 🚀 How to Use

### **Step 1: Run RLS Verification Script**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste contents of `rls_policies_verification.sql`
4. Run the script
5. Review the verification queries at the bottom to confirm:
   - ✅ All tables have RLS enabled
   - ✅ Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
   - ✅ `exercise_library` has public read access

### **Step 2: Test Guest Migration**

1. Create a guest account (anonymous sign-in)
2. Add some data:
   - Log meals
   - Log workouts
   - Add weight entries
   - Create recipes
   - Create meal plans
   - Generate grocery lists
   - Unlock achievements
3. Sign up for a real account
4. Verify all data is migrated correctly

---

## 🔒 Security Notes

### **RLS Policies Ensure:**
- ✅ Users can only access their own data (`auth.uid() = user_id`)
- ✅ Anonymous users can only access their own data
- ✅ No user can access another user's data
- ✅ Exercise library is publicly readable (reference data)

### **Policy Pattern:**
All policies follow this pattern:
```sql
CREATE POLICY "Users can [action] own [table]"
  ON [table] FOR [SELECT|INSERT|UPDATE|DELETE]
  USING (auth.uid() = user_id)  -- For SELECT, UPDATE, DELETE
  WITH CHECK (auth.uid() = user_id)  -- For INSERT, UPDATE
```

---

## ✅ Verification Checklist

After running the RLS script, verify:

- [ ] All 12 tables have RLS enabled
- [ ] Each user table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] `exercise_library` has public read access
- [ ] Guest users can create and access their own data
- [ ] Signed-in users can only access their own data
- [ ] Guest → Account migration works for all tables

---

## 📝 Notes

- The migration script handles errors gracefully and continues with other tables
- All errors are collected and returned in the response
- Progress callbacks are provided for UI feedback
- RLS policies use `DROP POLICY IF EXISTS` to avoid conflicts if re-running

---

## 🐛 Troubleshooting

### **Migration Errors:**
- Check Supabase logs for detailed error messages
- Verify table schemas match TypeScript types
- Ensure user has proper permissions

### **RLS Policy Issues:**
- Verify `auth.uid()` is available (user must be authenticated)
- Check if policies are conflicting
- Review Supabase logs for policy evaluation errors

---

## ✨ Next Steps

1. ✅ Run RLS verification script in Supabase
2. ✅ Test guest mode → account creation flow
3. ✅ Verify all data migrates correctly
4. ✅ Test RLS policies (try accessing another user's data - should fail)
5. ✅ Deploy to production! 🚀

