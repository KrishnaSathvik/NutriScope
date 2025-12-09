#!/bin/bash

# ============================================================================
# NUTRISCOPE APPLICATION VERIFICATION SCRIPT
# Comprehensive check of backend, database, and frontend
# ============================================================================

echo "🔍 NutriScope Application Verification"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

# ============================================================================
# 1. ENVIRONMENT VARIABLES CHECK
# ============================================================================

echo "📋 1. Checking Environment Variables..."
echo "----------------------------------------"

check_env_var() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}❌ Missing: $1${NC}"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✅ Found: $1${NC}"
        return 0
    fi
}

# Required variables
check_env_var "VITE_SUPABASE_URL"
check_env_var "VITE_SUPABASE_ANON_KEY"

# Optional but recommended
if [ -z "$VITE_GA_MEASUREMENT_ID" ]; then
    echo -e "${YELLOW}⚠️  Optional: VITE_GA_MEASUREMENT_ID (Google Analytics)${NC}"
    ((WARNINGS++))
fi

if [ -z "$VITE_SENTRY_DSN" ]; then
    echo -e "${YELLOW}⚠️  Optional: VITE_SENTRY_DSN (Error Tracking)${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 2. DATABASE SCHEMA CHECK
# ============================================================================

echo "🗄️  2. Checking Database Schema Files..."
echo "----------------------------------------"

if [ -f "supabase_schema.sql" ]; then
    echo -e "${GREEN}✅ Found: supabase_schema.sql${NC}"
    
    # Check for required tables
    if grep -q "CREATE TABLE.*user_profiles" supabase_schema.sql; then
        echo -e "${GREEN}  ✅ user_profiles table defined${NC}"
    else
        echo -e "${RED}  ❌ user_profiles table missing${NC}"
        ((ERRORS++))
    fi
    
    if grep -q "CREATE TABLE.*meals" supabase_schema.sql; then
        echo -e "${GREEN}  ✅ meals table defined${NC}"
    else
        echo -e "${RED}  ❌ meals table missing${NC}"
        ((ERRORS++))
    fi
    
    if grep -q "CREATE TABLE.*exercises" supabase_schema.sql; then
        echo -e "${GREEN}  ✅ exercises table defined${NC}"
    else
        echo -e "${RED}  ❌ exercises table missing${NC}"
        ((ERRORS++))
    fi
    
    if grep -q "CREATE TABLE.*daily_logs" supabase_schema.sql; then
        echo -e "${GREEN}  ✅ daily_logs table defined${NC}"
    else
        echo -e "${RED}  ❌ daily_logs table missing${NC}"
        ((ERRORS++))
    fi
    
    # Check for RLS policies
    if grep -q "ENABLE ROW LEVEL SECURITY\|ALTER TABLE.*ENABLE ROW LEVEL SECURITY" supabase_schema.sql; then
        echo -e "${GREEN}  ✅ RLS policies defined${NC}"
    else
        echo -e "${RED}  ❌ RLS policies missing${NC}"
        ((ERRORS++))
    fi
    
    # Check for reminder_settings with new types
    if grep -q "weight_reminders\|streak_reminders\|summary_reminders" supabase_schema.sql; then
        echo -e "${GREEN}  ✅ New reminder types in schema${NC}"
    else
        echo -e "${YELLOW}  ⚠️  New reminder types not in schema default${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ Missing: supabase_schema.sql${NC}"
    ((ERRORS++))
fi

echo ""

# ============================================================================
# 3. FRONTEND PAGES CHECK
# ============================================================================

echo "📄 3. Checking Frontend Pages..."
echo "---------------------------------"

PAGES=(
    "src/pages/LandingPage.tsx"
    "src/pages/Dashboard.tsx"
    "src/pages/MealsPage.tsx"
    "src/pages/WorkoutsPage.tsx"
    "src/pages/ChatPage.tsx"
    "src/pages/HistoryPage.tsx"
    "src/pages/AnalyticsPage.tsx"
    "src/pages/SummaryPage.tsx"
    "src/pages/ProfilePage.tsx"
    "src/pages/RecipesPage.tsx"
    "src/pages/MealPlanningPage.tsx"
    "src/pages/GroceryListPage.tsx"
    "src/pages/AchievementsPage.tsx"
    "src/pages/AuthPage.tsx"
)

MISSING_PAGES=0
for page in "${PAGES[@]}"; do
    if [ -f "$page" ]; then
        echo -e "${GREEN}✅ Found: $(basename $page)${NC}"
    else
        echo -e "${RED}❌ Missing: $(basename $page)${NC}"
        ((MISSING_PAGES++))
        ((ERRORS++))
    fi
done

if [ $MISSING_PAGES -eq 0 ]; then
    echo -e "${GREEN}✅ All pages present${NC}"
fi

echo ""

# ============================================================================
# 4. CRITICAL COMPONENTS CHECK
# ============================================================================

echo "🧩 4. Checking Critical Components..."
echo "-------------------------------------"

COMPONENTS=(
    "src/components/Layout.tsx"
    "src/components/ReminderScheduler.tsx"
    "src/components/ReminderSettings.tsx"
    "src/components/OnboardingDialog.tsx"
    "src/components/ErrorBoundary.tsx"
    "src/contexts/AuthContext.tsx"
)

MISSING_COMPONENTS=0
for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo -e "${GREEN}✅ Found: $(basename $component)${NC}"
    else
        echo -e "${RED}❌ Missing: $(basename $component)${NC}"
        ((MISSING_COMPONENTS++))
        ((ERRORS++))
    fi
done

if [ $MISSING_COMPONENTS -eq 0 ]; then
    echo -e "${GREEN}✅ All critical components present${NC}"
fi

echo ""

# ============================================================================
# 5. SERVICES CHECK
# ============================================================================

echo "⚙️  5. Checking Services..."
echo "----------------------------"

SERVICES=(
    "src/services/aiChat.ts"
    "src/services/notifications.ts"
    "src/services/dailyLogs.ts"
    "src/services/water.ts"
    "src/lib/supabase.ts"
)

MISSING_SERVICES=0
for service in "${SERVICES[@]}"; do
    if [ -f "$service" ]; then
        echo -e "${GREEN}✅ Found: $(basename $service)${NC}"
    else
        echo -e "${RED}❌ Missing: $(basename $service)${NC}"
        ((MISSING_SERVICES++))
        ((ERRORS++))
    fi
done

if [ $MISSING_SERVICES -eq 0 ]; then
    echo -e "${GREEN}✅ All services present${NC}"
fi

echo ""

# ============================================================================
# 6. TYPE DEFINITIONS CHECK
# ============================================================================

echo "📝 6. Checking Type Definitions..."
echo "-----------------------------------"

if [ -f "src/types/index.ts" ]; then
    echo -e "${GREEN}✅ Found: types/index.ts${NC}"
    
    # Check for new reminder types
    if grep -q "weight_reminders\|streak_reminders\|summary_reminders" src/types/index.ts; then
        echo -e "${GREEN}  ✅ New reminder types defined${NC}"
    else
        echo -e "${RED}  ❌ New reminder types missing${NC}"
        ((ERRORS++))
    fi
    
    # Check for UserProfile
    if grep -q "interface UserProfile\|type UserProfile" src/types/index.ts; then
        echo -e "${GREEN}  ✅ UserProfile type defined${NC}"
    else
        echo -e "${RED}  ❌ UserProfile type missing${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ Missing: types/index.ts${NC}"
    ((ERRORS++))
fi

echo ""

# ============================================================================
# 7. BUILD CHECK
# ============================================================================

echo "🔨 7. Checking Build Configuration..."
echo "--------------------------------------"

if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ Found: package.json${NC}"
    
    if grep -q "\"build\"" package.json; then
        echo -e "${GREEN}  ✅ Build script defined${NC}"
    else
        echo -e "${RED}  ❌ Build script missing${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ Missing: package.json${NC}"
    ((ERRORS++))
fi

if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
    echo -e "${GREEN}✅ Found: vite.config${NC}"
else
    echo -e "${YELLOW}⚠️  Missing: vite.config${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 8. ROUTES CHECK
# ============================================================================

echo "🛣️  8. Checking Routes..."
echo "--------------------------"

if [ -f "src/App.tsx" ]; then
    echo -e "${GREEN}✅ Found: App.tsx${NC}"
    
    # Check for lazy loading
    if grep -q "React.lazy\|lazy(" src/App.tsx; then
        echo -e "${GREEN}  ✅ Code splitting implemented${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Code splitting not implemented${NC}"
        ((WARNINGS++))
    fi
    
    # Check for Suspense
    if grep -q "Suspense" src/App.tsx; then
        echo -e "${GREEN}  ✅ Suspense boundaries present${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Suspense boundaries missing${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ Missing: App.tsx${NC}"
    ((ERRORS++))
fi

echo ""

# ============================================================================
# 9. ACCESSIBILITY CHECK
# ============================================================================

echo "♿ 9. Checking Accessibility..."
echo "-------------------------------"

if [ -f "src/components/Layout.tsx" ]; then
    if grep -q "aria-label\|aria-current\|skip.*content" src/components/Layout.tsx; then
        echo -e "${GREEN}✅ ARIA labels present in Layout${NC}"
    else
        echo -e "${YELLOW}⚠️  ARIA labels missing in Layout${NC}"
        ((WARNINGS++))
    fi
fi

if [ -f "src/index.css" ]; then
    if grep -q "sr-only\|skip" src/index.css; then
        echo -e "${GREEN}✅ Skip navigation styles present${NC}"
    else
        echo -e "${YELLOW}⚠️  Skip navigation styles missing${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

# ============================================================================
# 10. PERFORMANCE MONITORING CHECK
# ============================================================================

echo "⚡ 10. Checking Performance Monitoring..."
echo "-----------------------------------------"

if [ -f "src/utils/performance.ts" ]; then
    echo -e "${GREEN}✅ Found: performance.ts${NC}"
    
    if grep -q "trackAPICall\|performanceMonitor" src/utils/performance.ts; then
        echo -e "${GREEN}  ✅ Performance tracking functions present${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Performance tracking incomplete${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ Missing: performance.ts${NC}"
    ((ERRORS++))
fi

if [ -f "src/utils/analytics.ts" ]; then
    echo -e "${GREEN}✅ Found: analytics.ts${NC}"
else
    echo -e "${YELLOW}⚠️  Missing: analytics.ts${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 11. REMINDER SYSTEM CHECK
# ============================================================================

echo "🔔 11. Checking Reminder System..."
echo "-----------------------------------"

if [ -f "src/components/ReminderScheduler.tsx" ]; then
    echo -e "${GREEN}✅ Found: ReminderScheduler.tsx${NC}"
    
    # Check for new reminder types
    if grep -q "weight_reminders\|streak_reminders\|summary_reminders" src/components/ReminderScheduler.tsx; then
        echo -e "${GREEN}  ✅ New reminder types handled${NC}"
    else
        echo -e "${RED}  ❌ New reminder types not handled${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ Missing: ReminderScheduler.tsx${NC}"
    ((ERRORS++))
fi

if [ -f "src/components/ReminderSettings.tsx" ]; then
    echo -e "${GREEN}✅ Found: ReminderSettings.tsx${NC}"
    
    if grep -q "weight_reminders\|streak_reminders\|summary_reminders" src/components/ReminderSettings.tsx; then
        echo -e "${GREEN}  ✅ New reminder types in UI${NC}"
    else
        echo -e "${RED}  ❌ New reminder types missing from UI${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ Missing: ReminderSettings.tsx${NC}"
    ((ERRORS++))
fi

echo ""

# ============================================================================
# 12. SQL MIGRATION FILES CHECK
# ============================================================================

echo "📊 12. Checking SQL Migration Files..."
echo "---------------------------------------"

if [ -f "update_reminder_settings_schema.sql" ]; then
    echo -e "${GREEN}✅ Found: update_reminder_settings_schema.sql${NC}"
    
    # Check if it uses jsonb_build_object (fixed version)
    if grep -q "jsonb_build_object" update_reminder_settings_schema.sql; then
        echo -e "${GREEN}  ✅ Uses jsonb_build_object (fixed version)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  May have JSON syntax issues${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  Missing: update_reminder_settings_schema.sql${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "========================================"
echo "📊 VERIFICATION SUMMARY"
echo "========================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Application is ready.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found. Application should work but review warnings.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors before deploying."
    exit 1
fi

