# Supabase Setup Guide for NutriScope

This guide will help you set up the complete Supabase backend for NutriScope.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- A new Supabase project created

## Step 1: Run the SQL Schema

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `supabase_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

The schema will create:
- ✅ 6 database tables
- ✅ All necessary indexes
- ✅ Row Level Security (RLS) policies
- ✅ Storage bucket for images
- ✅ Triggers for automatic timestamps
- ✅ Helper functions

## Step 2: Enable Anonymous Authentication

1. Navigate to **Authentication** → **Providers** (left sidebar)
2. Scroll down to **Anonymous** provider
3. Toggle **Enable Anonymous Sign-ins** to ON
4. Click **Save**

This allows guest users to use the app without creating an account.

## Step 3: Verify Storage Bucket

1. Navigate to **Storage** (left sidebar)
2. Verify the `chat-images` bucket exists
3. Check that it's set to **Public**
4. Verify file size limit is 5MB (5242880 bytes)

## Step 4: Verify RLS Policies

1. Navigate to **Authentication** → **Policies** (left sidebar)
2. Verify RLS is enabled for all tables:
   - `user_profiles`
   - `meals`
   - `exercises`
   - `daily_logs`
   - `meal_templates`
   - `chat_conversations`

All policies should allow users to:
- SELECT their own data
- INSERT their own data
- UPDATE their own data
- DELETE their own data

## Step 5: Get Your API Keys

1. Navigate to **Project Settings** → **API** (left sidebar)
2. Copy the following values:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon public key** → Use as `VITE_SUPABASE_ANON_KEY`

## Step 6: Update Environment Variables

Create or update `.env` file in your project root:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_OPENAI_API_KEY=your_openai_key_here
```

## Step 7: Test the Setup

1. Start your development server: `npm run dev`
2. Try creating a guest account
3. Log a meal
4. Log a workout
5. Upload an image in chat
6. Check Supabase dashboard to verify data is being saved

## Database Schema Overview

### Tables

1. **user_profiles** - User information, goals, targets, reminder settings
2. **meals** - Individual meal logs with nutrition data
3. **exercises** - Workout/exercise logs
4. **daily_logs** - Aggregated daily summaries
5. **meal_templates** - Saved meal templates
6. **chat_conversations** - AI chat history

### Storage Buckets

- **chat-images** - Stores images for chat, meals, and workouts

### Key Features

- ✅ Supports anonymous (guest) users
- ✅ Row Level Security (RLS) for data isolation
- ✅ Automatic timestamp updates
- ✅ Optimized indexes for fast queries
- ✅ JSONB columns for flexible data storage

## Troubleshooting

### RLS Policy Errors

If you get permission errors:
1. Check that RLS is enabled on the table
2. Verify policies are created correctly
3. Ensure user is authenticated (check `auth.uid()`)

### Storage Upload Errors

If image uploads fail:
1. Verify `chat-images` bucket exists
2. Check bucket is set to Public
3. Verify storage policies are created
4. Check file size is under 5MB

### Anonymous User Issues

If guest mode doesn't work:
1. Verify Anonymous Authentication is enabled
2. Check RLS policies allow `auth.uid()` checks
3. Ensure policies don't require email

## Next Steps

After setup:
1. Test all features (meals, workouts, chat, analytics)
2. Verify data persistence
3. Test guest to account migration
4. Test reminder notifications

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify all SQL statements executed successfully
3. Check browser console for errors
4. Ensure environment variables are set correctly

