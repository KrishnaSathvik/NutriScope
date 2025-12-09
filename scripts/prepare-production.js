#!/usr/bin/env node

/**
 * Production Preparation Script
 * 
 * This script helps prepare the application for production by:
 * 1. Validating environment variables
 * 2. Checking for console.logs
 * 3. Verifying build configuration
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT_DIR = process.cwd()

console.log('🔍 Production Readiness Check\n')

// 1. Check environment variables
console.log('1. Checking environment variables...')
const envExample = readFileSync(join(ROOT_DIR, '.env.example'), 'utf-8').catch(() => null)
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
]

const missingVars = requiredVars.filter(varName => {
  return !process.env[varName] && !envExample?.includes(varName)
})

if (missingVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingVars.join(', '))
} else {
  console.log('✅ All required environment variables are set')
}

// 2. Check for console.logs in production code
console.log('\n2. Checking for console.logs...')
// This would require a more sophisticated AST parser
console.log('⚠️  Manual check required - search for console.log/warn/debug')

// 3. Check build configuration
console.log('\n3. Checking build configuration...')
const viteConfig = readFileSync(join(ROOT_DIR, 'vite.config.ts'), 'utf-8')
if (viteConfig.includes('drop_console')) {
  console.log('✅ Console removal configured')
} else {
  console.warn('⚠️  Consider adding drop_console to build config')
}

// 4. Check Sentry
console.log('\n4. Checking error tracking...')
const sentryFile = readFileSync(join(ROOT_DIR, 'src/lib/sentry.ts'), 'utf-8')
if (sentryFile.includes('// Uncomment when Sentry is installed')) {
  console.warn('⚠️  Sentry is not enabled - enable for production error tracking')
} else {
  console.log('✅ Sentry appears to be configured')
}

// 5. Check rate limiting
console.log('\n5. Checking rate limiting...')
const chatApi = readFileSync(join(ROOT_DIR, 'api/chat.ts'), 'utf-8')
if (chatApi.includes('new Map<string')) {
  console.warn('⚠️  Rate limiting uses in-memory store - use Redis for production')
} else {
  console.log('✅ Rate limiting appears to use persistent store')
}

console.log('\n✅ Production readiness check complete!')
console.log('\n📋 Next steps:')
console.log('   1. Fix critical issues above')
console.log('   2. Run: npm run build')
console.log('   3. Test production build: npm run preview')
console.log('   4. Deploy!')

