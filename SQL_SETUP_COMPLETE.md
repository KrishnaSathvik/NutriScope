# Complete Supabase SQL Setup Guide

Run these SQL files in **this exact order** in your Supabase SQL Editor:

## 📋 Setup Order

### 1️⃣ **Main Database Schema** (REQUIRED - Run First)
**File:** `supabase_schema.sql`

**What it creates:**
- ✅ User profiles table
- ✅ Meals table
- ✅ Exercises (workouts) table
- ✅ Daily logs table
- ✅ Meal templates table
- ✅ Chat conversations table
- ✅ Storage bucket for images
- ✅ All RLS policies
- ✅ Helper functions
- ✅ Triggers

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy entire contents of `supabase_schema.sql`
4. Paste and click "Run"

---

### 2️⃣ **Exercise Library Schema** (OPTIONAL - For Exercise Library Feature)
**File:** `exercise_library_schema.sql`

**What it creates:**
- ✅ Exercise library table with METs values
- ✅ Indexes for fast searching
- ✅ RLS policies (public read access)

**How to run:**
1. After main schema is complete
2. Copy entire contents of `exercise_library_schema.sql`
3. Paste in SQL Editor and click "Run"

**Then populate with data:**
**File:** `exercise_library_data.sql`

**What it does:**
- ✅ Inserts 150+ exercises with METs values
- ✅ Includes cardio, strength, yoga, sports exercises

**How to run:**
1. Copy entire contents of `exercise_library_data.sql`
2. Paste in SQL Editor and click "Run"

---

### 3️⃣ **Weight Tracking Schema** (OPTIONAL - For Weight Tracking Feature)
**File:** `weight_tracking_schema.sql`

**What it creates:**
- ✅ Weight logs table
- ✅ BMI calculation functions
- ✅ Weight change tracking functions
- ✅ RLS policies
- ✅ Indexes

**How to run:**
1. After main schema is complete
2. Copy entire contents of `weight_tracking_schema.sql`
3. Paste in SQL Editor and click "Run"

---

## 🚀 Quick Setup (Minimum Required)

**If you want to get started quickly, run ONLY:**

1. `supabase_schema.sql` ← **REQUIRED**

This gives you:
- ✅ User authentication
- ✅ Meal logging
- ✅ Workout logging
- ✅ Chat conversations
- ✅ Meal templates
- ✅ Daily summaries
- ✅ Image uploads

---

## 📝 Complete Setup (All Features)

**For all features, run in this order:**

1. ✅ `supabase_schema.sql` ← **REQUIRED FIRST**
2. ✅ `exercise_library_schema.sql` ← For Exercise Library
3. ✅ `exercise_library_data.sql` ← Populate Exercise Library
4. ✅ `weight_tracking_schema.sql` ← For Weight Tracking

---

## ⚙️ Additional Configuration

### Enable Anonymous Authentication

After running the SQL schemas:

1. Go to **Authentication** → **Providers**
2. Find **Anonymous** provider
3. Toggle **Enable Anonymous Sign-ins** to **ON**
4. Click **Save**

This allows guest users to use the app.

---

## ✅ Verification Checklist

After running all SQL files:

- [ ] All tables created (check in Table Editor)
- [ ] RLS policies enabled (check in Authentication → Policies)
- [ ] Storage bucket `chat-images` exists (check in Storage)
- [ ] Anonymous authentication enabled
- [ ] No SQL errors in logs

---

## 🔍 How to Check if Setup is Complete

### Check Tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Should show:
- chat_conversations
- daily_logs
- exercises
- exercise_library (if you ran exercise library schema)
- meal_templates
- meals
- user_profiles
- weight_logs (if you ran weight tracking schema)

### Check Storage Buckets:
```sql
SELECT name FROM storage.buckets;
```

Should show:
- chat-images

### Check RLS Policies:
Go to **Authentication** → **Policies** and verify all tables have policies.

---

## 🐛 Troubleshooting

### Error: "relation already exists"
- Tables already created - this is OK, the `IF NOT EXISTS` clause prevents errors
- You can safely re-run the schemas

### Error: "function already exists"
- Functions already created - this is OK
- You can safely re-run the schemas

### Error: "permission denied"
- Make sure you're running as the database owner
- Check that you're in the SQL Editor (not Table Editor)

### RLS Policy Errors
- Verify all policies were created
- Check that `auth.uid()` is working correctly
- Ensure Anonymous Authentication is enabled

---

## 📚 File Summary

| File | Purpose | Required? | Size |
|------|---------|-----------|------|
| `supabase_schema.sql` | Main database schema | ✅ **YES** | ~500 lines |
| `exercise_library_schema.sql` | Exercise library table | ⚠️ Optional | ~80 lines |
| `exercise_library_data.sql` | Exercise library data | ⚠️ Optional | ~500+ lines |
| `weight_tracking_schema.sql` | Weight tracking | ⚠️ Optional | ~150 lines |

---

## 🎯 Next Steps After SQL Setup

1. ✅ Enable Anonymous Authentication (see above)
2. ✅ Verify environment variables in `.env` file
3. ✅ Test the app: `npm run dev`
4. ✅ Try creating a guest account
5. ✅ Log a meal and workout
6. ✅ Test chat with image upload

---

## 💡 Pro Tips

- **Run schemas one at a time** - Don't combine multiple files
- **Check for errors** - If you see errors, read them carefully
- **Backup first** - If you have existing data, export it first
- **Test incrementally** - After each schema, test that feature

---

## 📞 Need Help?

If you encounter issues:
1. Check Supabase Dashboard → Logs
2. Verify SQL executed without errors
3. Check browser console for errors
4. Ensure environment variables are set correctly

