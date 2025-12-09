# Supabase Realtime Subscriptions Setup

## ✅ Implementation Complete

All pages now have realtime subscriptions enabled! Data will update automatically across tabs and pages when changes occur.

## 📋 What Was Added

### 1. **Reusable Hook** (`src/hooks/useRealtimeSubscription.ts`)
- `useRealtimeSubscription()` - Generic subscription hook
- `useUserRealtimeSubscription()` - User-filtered subscription hook
- Automatically invalidates React Query cache on changes
- Proper cleanup on unmount

### 2. **Pages with Realtime Subscriptions**

#### ✅ Dashboard
- `meals` → Updates meals, dailyLog, aiInsights
- `exercises` → Updates exercises, dailyLog, aiInsights
- `daily_logs` → Updates dailyLog, waterIntake
- `weight_logs` → Updates weightLogs

#### ✅ Meals Page
- `meals` → Updates meals, dailyLog, aiInsights

#### ✅ Workouts Page
- `exercises` → Updates exercises, dailyLog, aiInsights

#### ✅ Analytics Page
- `meals` → Updates analytics, dailyLog
- `exercises` → Updates analytics, dailyLog
- `daily_logs` → Updates analytics, dailyLog
- `weight_logs` → Updates weightLogs, correlations, predictions

#### ✅ Recipes Page
- `recipes` → Updates recipes

#### ✅ Grocery Lists Page
- `grocery_lists` → Updates groceryLists
- `meal_plans` → Updates mealPlan

#### ✅ Meal Planning Page
- `meal_plans` → Updates mealPlan, groceryLists
- `recipes` → Updates recipes

#### ✅ History Page
- `meals` → Updates dailyLog, weekLogs
- `exercises` → Updates dailyLog, weekLogs
- `daily_logs` → Updates dailyLog, weekLogs

#### ✅ Summary Page
- `meals` → Updates dailyLog, aiInsights
- `exercises` → Updates dailyLog, aiInsights
- `daily_logs` → Updates dailyLog, aiInsights

#### ✅ Chat Page
- `chat_conversations` → Updates conversations

#### ✅ Achievements Page
- `achievements` → Updates achievementsWithProgress
- `meals` → Updates achievementsWithProgress
- `exercises` → Updates achievementsWithProgress
- `daily_logs` → Updates achievementsWithProgress

#### ✅ Profile Page
- `user_profiles` → Updates profile
- `weight_logs` → Updates latestWeight

## 🔧 Database Setup Required

**IMPORTANT:** For realtime to work, you need to enable replication on your Supabase tables.

### Option 1: Run SQL Script
Run the `enable_realtime.sql` file in your Supabase SQL Editor.

### Option 2: Manual Setup
Run this SQL in your Supabase SQL Editor:

```sql
-- Enable replication for all tables
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
```

### Verify Setup
To check if replication is enabled:
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## 🎯 How It Works

1. **When data changes** in Supabase (INSERT, UPDATE, DELETE)
2. **Supabase sends a realtime event** to subscribed clients
3. **Hook receives the event** and invalidates React Query cache
4. **React Query automatically refetches** the affected queries
5. **UI updates instantly** without manual refresh

## ✨ Benefits

- ✅ **True real-time updates** - Changes appear instantly
- ✅ **Cross-tab sync** - Updates in one tab appear in others
- ✅ **Automatic cache invalidation** - No manual refresh needed
- ✅ **Efficient** - Only refetches affected queries
- ✅ **User-filtered** - Only receives updates for your own data

## 🧪 Testing

1. Open the app in two browser tabs
2. Log a meal in Tab 1
3. Watch Tab 2 update automatically (Dashboard, Meals page, etc.)
4. Update a workout in Tab 1
5. See Tab 2 reflect the changes instantly

## 📝 Notes

- Realtime subscriptions only work when Supabase is properly configured
- Subscriptions are automatically cleaned up when components unmount
- Each subscription is filtered by `user_id` for security
- Console logs show `[Realtime]` messages for debugging

