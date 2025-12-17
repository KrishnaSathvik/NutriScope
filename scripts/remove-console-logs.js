#!/usr/bin/env node

/**
 * Script to replace console.log/warn/error/debug with production-safe versions
 * in the service worker file
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const swPath = path.join(__dirname, '../public/sw.js')

console.log('Reading service worker file...')
let content = fs.readFileSync(swPath, 'utf8')

// Count original console statements
const originalLogs = (content.match(/console\.log\(/g) || []).length
const originalWarns = (content.match(/console\.warn\(/g) || []).length
const originalErrors = (content.match(/console\.error\(/g) || []).length
const originalDebugs = (content.match(/console\.debug\(/g) || []).length

console.log(`Found ${originalLogs} console.log, ${originalWarns} console.warn, ${originalErrors} console.error, ${originalDebugs} console.debug`)

// Replace console.log with swLog (but keep the ones in the logger definition)
content = content.replace(/console\.log\(/g, (match, offset) => {
  // Don't replace console.log in the logger definition itself (lines 16-17)
  const beforeMatch = content.substring(Math.max(0, offset - 200), offset)
  if (beforeMatch.includes('const swLog') || beforeMatch.includes('const swWarn') || beforeMatch.includes('const swError') || beforeMatch.includes('const swDebug')) {
    return match
  }
  return 'swLog('
})

// Replace console.warn with swWarn
content = content.replace(/console\.warn\(/g, (match, offset) => {
  const beforeMatch = content.substring(Math.max(0, offset - 200), offset)
  if (beforeMatch.includes('const swLog') || beforeMatch.includes('const swWarn') || beforeMatch.includes('const swError') || beforeMatch.includes('const swDebug')) {
    return match
  }
  return 'swWarn('
})

// Replace console.error with swError (but keep the one in swError definition)
content = content.replace(/console\.error\(/g, (match, offset) => {
  const beforeMatch = content.substring(Math.max(0, offset - 200), offset)
  if (beforeMatch.includes('const swError')) {
    return match // Keep the console.error in swError definition
  }
  return 'swError('
})

// Replace console.debug with swDebug
content = content.replace(/console\.debug\(/g, (match, offset) => {
  const beforeMatch = content.substring(Math.max(0, offset - 200), offset)
  if (beforeMatch.includes('const swLog') || beforeMatch.includes('const swWarn') || beforeMatch.includes('const swError') || beforeMatch.includes('const swDebug')) {
    return match
  }
  return 'swDebug('
})

// Write back
fs.writeFileSync(swPath, content, 'utf8')

// Count replacements
const newLogs = (content.match(/swLog\(/g) || []).length
const newWarns = (content.match(/swWarn\(/g) || []).length
const newErrors = (content.match(/swError\(/g) || []).length
const newDebugs = (content.match(/swDebug\(/g) || []).length

console.log(`✅ Replaced console statements:`)
console.log(`   - console.log → swLog: ${newLogs} instances`)
console.log(`   - console.warn → swWarn: ${newWarns} instances`)
console.log(`   - console.error → swError: ${newErrors} instances`)
console.log(`   - console.debug → swDebug: ${newDebugs} instances`)
console.log(`\n✅ Service worker updated! Console logs will be disabled in production.`)

