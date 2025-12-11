/**
 * Utility script to reset onboarding for a specific user
 * 
 * Usage:
 * 1. Update USER_ID below with the target user ID
 * 2. Run: npx tsx scripts/reset-onboarding.ts
 * 
 * Or use the SQL migration file: migrations/012_reset_onboarding_for_user.sql
 */

import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase URL and anon key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

// Replace with the user ID you want to reset onboarding for
const USER_ID = 'USER_ID_HERE' // <-- UPDATE THIS

async function resetOnboarding() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  if (USER_ID === 'USER_ID_HERE') {
    console.error('❌ Please update USER_ID in the script with the actual user ID')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log(`🔄 Resetting onboarding for user: ${USER_ID}`)

  // Option 1: Delete the entire profile (triggers onboarding)
  const { error: deleteError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', USER_ID)

  if (deleteError) {
    console.error('❌ Error deleting profile:', deleteError)
    process.exit(1)
  }

  console.log('✅ Profile deleted successfully!')
  console.log('✅ User will see onboarding on next login')
  console.log('')
  console.log('Note: The user needs to log out and log back in to see the onboarding dialog.')
}

resetOnboarding().catch(console.error)

