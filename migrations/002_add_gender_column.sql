-- ============================================================================
-- ADD GENDER COLUMN TO user_profiles
-- Migration: 002_add_gender_column.sql
-- Description: Adds gender column to user_profiles table for accurate BMR calculation
-- ============================================================================

-- Add gender column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.gender IS 'User gender for BMR calculation (male/female)';

