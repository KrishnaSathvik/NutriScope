# localStorage → Supabase Migration Analysis

## 📊 Current localStorage Usage Overview

### ✅ **Should STAY in localStorage** (Client-side only, temporary, or browser-specific)

1. **Guest Mode Data** (`nutriscope_guest_*`)
   - **Location**: `AuthContext.tsx`, `LandingPage.tsx`, `AuthPage.tsx`, `storage.ts`
   - **Keys**: `nutriscope_guest_user_id`, `nutriscope_has_guest_data`, `nutriscope_restore_guest_data`, `nutriscope_old_guest_user_id`
   - **Reason**: Temporary guest user data, should be cleared on logout. Not real user data.
   - **Status**: ✅ Keep in localStorage

2. **Theme Preference** (`theme`)
   - **Location**: `ThemeContext.tsx`, `main.tsx`
   - **Key**: `theme`
   - **Reason**: Browser-specific preference. Can sync via browser sync, but fine in localStorage.
   - **Status**: ✅ Keep in localStorage (optional: could migrate for cross-device sync)

3. **Install Prompt Dismissal** (`install-prompt-dismissed`)
   - **Location**: `InstallPrompt.tsx`
   - **Key**: `install-prompt-dismissed`
   - **Reason**: Browser-specific UI preference (PWA install prompt)
   - **Status**: ✅ Keep in localStorage (optional: could migrate for cross-device sync)

---

### 🔄 **Should MIGRATE to Supabase** (User data that should sync across devices)

#### **Priority 1: User Preferences** (High Value)

1. **Notification Dialog Dismissal** (`notification_dialog_dismissed`)
   - **Location**: `AuthContext.tsx` (line 298, 309)
   - **Current**: `localStorage.getItem('notification_dialog_dismissed')`
   - **Recommendation**: Add to `user_profiles` table as `preferences JSONB` field
   - **Benefit**: User won't see notification dialog on every device after dismissing once
   - **Migration**: Easy - single boolean flag

2. **Theme Preference** (`theme`) - Optional but recommended
   - **Location**: `ThemeContext.tsx`
   - **Current**: `localStorage.getItem('theme')`
   - **Recommendation**: Add to `user_profiles.preferences` JSONB field
   - **Benefit**: Theme syncs across all user devices
   - **Migration**: Easy - single string value

#### **Priority 2: Computed/Cached Data** (Medium Value - Performance Optimization)

3. **Streak Data Cache** (`streak_${user.id}_${today}`)
   - **Location**: `StreakWidget.tsx`
   - **Current**: Cached in localStorage, recalculated daily
   - **Recommendation**: Add `user_streaks` table or `streak_data` column to `user_profiles`
   - **Schema Suggestion**:
     ```sql
     CREATE TABLE user_streaks (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       current_streak INTEGER DEFAULT 0,
       longest_streak INTEGER DEFAULT 0,
       last_log_date DATE,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE(user_id)
     );
     ```
   - **Benefit**: Faster loading, no recalculation needed, syncs across devices
   - **Migration**: Medium complexity - need to compute initial values

4. **Achievements Cache** (`achievements_${user.id}_${today}`)
   - **Location**: `AchievementsPage.tsx`
   - **Current**: Cached computed achievements with progress
   - **Recommendation**: Achievements are already in DB (`achievements` table), but progress is computed
   - **Note**: Progress is computed from daily logs, so caching might not be necessary if daily logs are fast
   - **Status**: ⚠️ Low priority - achievements already in DB, progress is computed on-demand

#### **Priority 3: AI-Generated Content** (Low-Medium Value - Cross-device sync)

5. **Coach Tips Cache** (`quickTip_${user.id}_${today}_${tipIndex}`)
   - **Location**: `Dashboard.tsx`
   - **Current**: Cached AI-generated inspirational tips (rotates 2-3 per day)
   - **Recommendation**: Add `user_ai_cache` table or `ai_cache` JSONB column
   - **Schema Suggestion**:
     ```sql
     CREATE TABLE user_ai_cache (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       cache_type TEXT NOT NULL CHECK (cache_type IN ('coach_tip', 'daily_insight')),
       date DATE NOT NULL,
       tip_index INTEGER, -- For coach tips (0, 1, 2)
       content TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE(user_id, cache_type, date, tip_index)
     );
     ```
   - **Benefit**: Tips sync across devices, no regeneration needed
   - **Migration**: Medium complexity - need to handle tip rotation logic

6. **Daily AI Insights Cache** (`aiInsight_${dateStr}_${signature}`)
   - **Location**: `SummaryPage.tsx`
   - **Current**: Cached AI-generated daily insights (based on data signature)
   - **Recommendation**: Same `user_ai_cache` table as coach tips
   - **Benefit**: Insights sync across devices, no regeneration needed
   - **Migration**: Medium complexity - need to handle data signature matching

---

## 🎯 **Recommended Migration Plan**

### **Phase 1: User Preferences** (Quick Win - High Value)

**Add `preferences` JSONB column to `user_profiles`:**

```sql
-- Add preferences column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences 
ON user_profiles USING GIN (preferences);
```

**Migration Steps:**
1. Update `user_profiles` schema to include `preferences` JSONB
2. Update `UserProfile` TypeScript type to include `preferences?: { notificationDialogDismissed?: boolean; theme?: 'light' | 'dark' | 'system' }`
3. Update `AuthContext.tsx` to read/write `notification_dialog_dismissed` from DB instead of localStorage
4. Update `ThemeContext.tsx` to read/write `theme` from DB instead of localStorage (optional)
5. Migrate existing localStorage data on first login

**Files to Update:**
- `src/types/index.ts` - Add `preferences` to `UserProfile`
- `src/contexts/AuthContext.tsx` - Migrate notification dialog dismissal
- `src/contexts/ThemeContext.tsx` - Migrate theme preference (optional)
- `src/services/profile.ts` - Add functions to update preferences

---

### **Phase 2: Computed Data** (Performance Optimization)

**Add `user_streaks` table:**

```sql
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_log_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
```

**Migration Steps:**
1. Create `user_streaks` table
2. Create service functions to read/write streak data (`src/services/streaks.ts`)
3. Update `StreakWidget.tsx` to use DB instead of localStorage
4. Compute initial streak values for existing users (one-time migration script)

**Files to Update:**
- `src/services/streaks.ts` - New file for streak DB operations
- `src/components/StreakWidget.tsx` - Use DB instead of localStorage
- `src/utils/streak.ts` - Update `calculateLoggingStreak` to also update DB

---

### **Phase 3: AI Cache** (Cross-device Sync)

**Add `user_ai_cache` table:**

```sql
CREATE TABLE IF NOT EXISTS user_ai_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('coach_tip', 'daily_insight')),
  date DATE NOT NULL,
  tip_index INTEGER, -- NULL for daily_insight, 0-2 for coach_tip
  content TEXT NOT NULL,
  data_signature TEXT, -- For daily_insight cache validation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, cache_type, date, COALESCE(tip_index, -1))
);

CREATE INDEX IF NOT EXISTS idx_user_ai_cache_user_date 
ON user_ai_cache(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_ai_cache_type 
ON user_ai_cache(cache_type);
```

**Migration Steps:**
1. Create `user_ai_cache` table
2. Create service functions to read/write AI cache (`src/services/aiCache.ts`)
3. Update `Dashboard.tsx` to use DB for coach tips
4. Update `SummaryPage.tsx` to use DB for daily insights
5. Migrate existing localStorage cache on first access (optional - can regenerate)

**Files to Update:**
- `src/services/aiCache.ts` - New file for AI cache DB operations
- `src/pages/Dashboard.tsx` - Use DB instead of localStorage
- `src/pages/SummaryPage.tsx` - Use DB instead of localStorage

---

## 📋 **Summary Table**

| Data Type | Current Location | Priority | Complexity | Benefit |
|-----------|-----------------|----------|------------|---------|
| **Notification Dialog Dismissal** | localStorage | **High** | Low | Cross-device sync |
| **Theme Preference** | localStorage | Medium | Low | Cross-device sync (optional) |
| **Streak Data** | localStorage | **High** | Medium | Performance + sync |
| **Coach Tips** | localStorage | Medium | Medium | Cross-device sync |
| **Daily Insights** | localStorage | Medium | Medium | Cross-device sync |
| **Achievements Cache** | localStorage | Low | Low | Already computed, low value |
| **Guest Mode Data** | localStorage | N/A | N/A | ✅ Keep in localStorage |
| **Install Prompt** | localStorage | Low | Low | Browser-specific, keep |

---

## 🚀 **Recommended Implementation Order**

1. **Phase 1: User Preferences** (1-2 hours)
   - Highest value, easiest to implement
   - Immediate user benefit (cross-device sync)

2. **Phase 2: Streak Data** (2-3 hours)
   - Performance optimization
   - Reduces computation on every page load

3. **Phase 3: AI Cache** (3-4 hours)
   - Nice-to-have for cross-device sync
   - Can be done later if needed

---

## ⚠️ **Notes**

- **Guest Mode**: All guest-related localStorage should stay in localStorage (temporary data)
- **Backward Compatibility**: Migration should read from localStorage first, then fall back to DB, then migrate
- **Performance**: DB queries are fast with proper indexes, but localStorage is still faster for read-heavy operations
- **Cache Invalidation**: Need to handle cache expiration properly (daily for tips/insights, real-time for streaks)

---

## 🔧 **Next Steps**

1. Review this analysis
2. Decide which phases to implement
3. Create migration SQL scripts
4. Update TypeScript types
5. Update service functions
6. Update components to use DB
7. Test cross-device sync
8. Deploy migration scripts

