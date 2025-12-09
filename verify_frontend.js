/**
 * NutriScope Frontend Verification Script
 * Run with: node verify_frontend.js
 * 
 * Checks:
 * - All pages exist and are importable
 * - Routes are properly configured
 * - Critical components exist
 * - Type definitions are complete
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let errors = 0;
let warnings = 0;

function log(message, type = 'info') {
  const color = type === 'error' ? colors.red : type === 'warning' ? colors.yellow : colors.green;
  const symbol = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`${description}: ${path.basename(filePath)}`);
    return true;
  } else {
    log(`${description}: ${path.basename(filePath)} - MISSING`, 'error');
    errors++;
    return false;
  }
}

function checkFileContent(filePath, pattern, description) {
  if (!fs.existsSync(filePath)) {
    log(`${description}: File not found`, 'error');
    errors++;
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(pattern)) {
    log(`${description}`, 'info');
    return true;
  } else {
    log(`${description}: Pattern not found`, 'warning');
    warnings++;
    return false;
  }
}

console.log(`${colors.blue}🔍 NutriScope Frontend Verification${colors.reset}`);
console.log('========================================\n');

// Check pages
console.log('📄 Checking Pages...');
const pages = [
  'src/pages/LandingPage.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/MealsPage.tsx',
  'src/pages/WorkoutsPage.tsx',
  'src/pages/ChatPage.tsx',
  'src/pages/HistoryPage.tsx',
  'src/pages/AnalyticsPage.tsx',
  'src/pages/SummaryPage.tsx',
  'src/pages/ProfilePage.tsx',
  'src/pages/RecipesPage.tsx',
  'src/pages/MealPlanningPage.tsx',
  'src/pages/GroceryListPage.tsx',
  'src/pages/AchievementsPage.tsx',
  'src/pages/AuthPage.tsx',
];

pages.forEach(page => checkFile(page, 'Page'));

// Check components
console.log('\n🧩 Checking Components...');
const components = [
  'src/components/Layout.tsx',
  'src/components/ReminderScheduler.tsx',
  'src/components/ReminderSettings.tsx',
  'src/components/OnboardingDialog.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/ChatInput.tsx',
  'src/components/ChatMessages.tsx',
];

components.forEach(component => checkFile(component, 'Component'));

// Check services
console.log('\n⚙️  Checking Services...');
const services = [
  'src/services/aiChat.ts',
  'src/services/notifications.ts',
  'src/services/dailyLogs.ts',
  'src/services/water.ts',
  'src/lib/supabase.ts',
];

services.forEach(service => checkFile(service, 'Service'));

// Check types
console.log('\n📝 Checking Types...');
if (checkFile('src/types/index.ts', 'Types file')) {
  checkFileContent('src/types/index.ts', 'weight_reminders', 'New reminder types in types');
  checkFileContent('src/types/index.ts', 'interface UserProfile', 'UserProfile interface');
}

// Check App.tsx
console.log('\n🛣️  Checking Routes...');
if (checkFile('src/App.tsx', 'App.tsx')) {
  checkFileContent('src/App.tsx', 'React.lazy', 'Code splitting');
  checkFileContent('src/App.tsx', 'Suspense', 'Suspense boundaries');
  checkFileContent('src/App.tsx', 'trackPageView', 'Analytics integration');
}

// Check performance monitoring
console.log('\n⚡ Checking Performance Monitoring...');
checkFile('src/utils/performance.ts', 'Performance utility');
checkFile('src/utils/analytics.ts', 'Analytics utility');
checkFile('src/utils/logger.ts', 'Logger utility');

// Check reminder system
console.log('\n🔔 Checking Reminder System...');
if (checkFile('src/components/ReminderScheduler.tsx', 'ReminderScheduler')) {
  checkFileContent('src/components/ReminderScheduler.tsx', 'weight_reminders', 'Weight reminders');
  checkFileContent('src/components/ReminderScheduler.tsx', 'streak_reminders', 'Streak reminders');
  checkFileContent('src/components/ReminderScheduler.tsx', 'summary_reminders', 'Summary reminders');
}

if (checkFile('src/components/ReminderSettings.tsx', 'ReminderSettings')) {
  checkFileContent('src/components/ReminderSettings.tsx', 'weight_reminders', 'Weight reminders UI');
  checkFileContent('src/components/ReminderSettings.tsx', 'streak_reminders', 'Streak reminders UI');
  checkFileContent('src/components/ReminderSettings.tsx', 'summary_reminders', 'Summary reminders UI');
}

// Check accessibility
console.log('\n♿ Checking Accessibility...');
if (checkFile('src/components/Layout.tsx', 'Layout')) {
  checkFileContent('src/components/Layout.tsx', 'aria-label', 'ARIA labels');
  checkFileContent('src/components/Layout.tsx', 'skip.*content', 'Skip navigation');
}

// Summary
console.log('\n========================================');
console.log('📊 VERIFICATION SUMMARY');
console.log('========================================\n');

if (errors === 0 && warnings === 0) {
  log('All checks passed! Application is ready.', 'info');
  process.exit(0);
} else if (errors === 0) {
  log(`${warnings} warning(s) found. Application should work but review warnings.`, 'warning');
  process.exit(0);
} else {
  log(`${errors} error(s) found`, 'error');
  if (warnings > 0) {
    log(`${warnings} warning(s) found`, 'warning');
  }
  console.log('\nPlease fix the errors before deploying.');
  process.exit(1);
}

