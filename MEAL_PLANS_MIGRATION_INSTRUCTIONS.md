# Meal Plans Table Migration Instructions

## Error: 406 (Not Acceptable) on meal_plans table

If you're seeing a 406 error when trying to access meal plans, it means the `meal_plans` table doesn't exist in your Supabase database.

## Solution

Run the migration script `add_meal_plans_schema.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `add_meal_plans_schema.sql`
4. Click "Run" to execute the migration

## What the migration creates:

- `meal_plans` table with proper schema
- Indexes for performance
- RLS (Row Level Security) policies
- Updated_at trigger

## After running the migration:

The meal planning feature will work correctly and you won't see 406 errors anymore.

