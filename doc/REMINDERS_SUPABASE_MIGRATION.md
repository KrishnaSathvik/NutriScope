# Reminders Migration to Supabase ✅

## Overview
Reminders have been migrated from IndexedDB to Supabase for more reliable triggering. This ensures reminders work even when the browser is closed and provides better synchronization across devices.

## Changes Made

### 1. Database Schema
- **File**: `reminders_schema.sql`
- Created `reminders` table in Supabase
- Added RLS policies for user data security
- Created `get_upcoming_reminders()` function for efficient queries
- Added indexes for performance

### 2. Supabase Reminder Service
- **File**: `src/services/supabaseReminders.ts`
- New service to manage reminders in Supabase
- Handles all reminder types: meal, water, workout, goal, streak, weight, summary
- Calculates next trigger times correctly
- **Fixed**: Water reminder time calculation to handle edge cases properly

### 3. ReminderScheduler Component
- **File**: `src/components/ReminderScheduler.tsx`
- Updated to use Supabase instead of IndexedDB
- Sends Supabase configuration to service worker
- Falls back gracefully if Supabase is unavailable

### 4. Service Worker
- **File**: `public/sw.js`
- Updated to read reminders from Supabase REST API
- Falls back to IndexedDB for backward compatibility
- Handles both Supabase and IndexedDB reminder formats
- **Fixed**: Water reminder calculation matches the main service

## Setup Instructions

### Step 1: Run Database Migration
Run the SQL schema file in your Supabase SQL Editor:

```bash
# Copy the contents of reminders_schema.sql and run in Supabase SQL Editor
```

Or use the Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Environment Variables
Ensure these are set in your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Test Reminders
1. Open the app and go to Reminder Settings
2. Enable reminders and configure times
3. Check browser console for reminder scheduling logs
4. Check service worker logs (Chrome DevTools > Application > Service Workers)
5. Verify reminders trigger at the correct times

## How It Works

1. **Reminder Creation**: When user saves reminder settings, `ReminderScheduler` calls `supabaseReminderService.createRemindersFromSettings()` which:
   - Deletes old reminders for the user
   - Creates new reminders based on settings
   - Saves them to Supabase `reminders` table

2. **Service Worker Configuration**: The main app sends Supabase config (URL, anon key, user ID, access token) to the service worker via `postMessage`.

3. **Reminder Checking**: Service worker checks reminders every 30 seconds:
   - Fetches upcoming reminders from Supabase using `get_upcoming_reminders()` function
   - Checks if any reminders should trigger (within 30-second window)
   - Shows notification if trigger time has passed
   - Updates reminder in Supabase with next trigger time

4. **Fallback**: If Supabase is unavailable or user is not authenticated, falls back to IndexedDB for backward compatibility.

## Benefits

✅ **Reliable**: Reminders stored in database, not browser storage
✅ **Persistent**: Works even when browser is closed
✅ **Accurate**: Server-side time calculations
✅ **Synchronized**: Same reminders across devices
✅ **Scalable**: Can add server-side reminder triggers in future

## Troubleshooting

### Reminders Not Triggering
1. Check browser console for errors
2. Check service worker logs
3. Verify Supabase connection (check network tab)
4. Verify notification permissions are granted
5. Check that reminders are saved in Supabase (query `reminders` table)

### Water Reminder Time Wrong
- The calculation now handles edge cases properly
- If still incorrect, check `water_reminders.start_time` in user settings
- Verify timezone settings match your location

### Service Worker Not Updating
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Unregister service worker in DevTools and reload
- Check that service worker version changed (should be v9)

## Migration Notes

- Old IndexedDB reminders are still supported as fallback
- New reminders are created in Supabase
- Both systems can coexist during transition
- IndexedDB will be deprecated in future versions

