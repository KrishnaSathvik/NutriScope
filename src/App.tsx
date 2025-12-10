import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { performanceMonitor } from '@/utils/performance'
import { trackPageView } from '@/utils/analytics'
import { ToastProvider } from '@/components/ui/toaster'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { OnboardingDialog } from '@/components/OnboardingDialog'
import { NotificationPermissionDialog } from '@/components/NotificationPermissionDialog'
import { GuestRestoreDialog } from '@/components/GuestRestoreDialog'
import { ReminderScheduler } from '@/components/ReminderScheduler'
import { InstallPrompt } from '@/components/InstallPrompt'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import ScrollToTop from '@/components/ScrollToTop'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Loader2 } from 'lucide-react'

// Keep critical pages as regular imports (needed immediately)
import LandingPage from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const MealsPage = lazy(() => import('@/pages/MealsPage'))
const WorkoutsPage = lazy(() => import('@/pages/WorkoutsPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const SummaryPage = lazy(() => import('@/pages/SummaryPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const RecipesPage = lazy(() => import('@/pages/RecipesPage'))
const MealPlanningPage = lazy(() => import('@/pages/MealPlanningPage'))
const GroceryListPage = lazy(() => import('@/pages/GroceryListPage'))
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const CookiePolicyPage = lazy(() => import('@/pages/CookiePolicyPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/TermsPage'))
const HelpPage = lazy(() => import('@/pages/HelpPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const DocumentationPage = lazy(() => import('@/pages/DocumentationPage'))

// Loading fallback component
function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-acid animate-spin" />
        <p className="text-dim font-mono text-sm">Loading...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const routeStartTime = useRef(performance.now())
  
  const { 
    showOnboarding, 
    showNotificationDialog, 
    showGuestRestoreDialog,
    user, 
    isGuest,
    loading,
    completeOnboarding, 
    dismissNotificationDialog,
    dismissGuestRestoreDialog,
  } = useAuth()

  // Track route changes for performance monitoring and analytics
  useEffect(() => {
    const routeChangeTime = performance.now() - routeStartTime.current
    performanceMonitor.trackRouteChange(
      location.pathname,
      routeStartTime.current,
      performance.now()
    )
    
    // Track page view in Google Analytics
    trackPageView(location.pathname, document.title)
    
    routeStartTime.current = performance.now()
  }, [location.pathname])

  const handleNotificationEnable = () => {
    // Notification permission granted - user can configure reminders in settings
    dismissNotificationDialog()
  }

  // Root route handler - redirect authenticated/guest users to Dashboard
  const RootRoute = () => {
    // Show loading while checking auth state
    if (loading) {
      return <PageLoadingFallback />
    }
    
    // If user is authenticated or guest, redirect to Dashboard
    if (user || isGuest) {
      return <Navigate to="/dashboard" replace />
    }
    
    // Otherwise show Landing page for unauthenticated users
    return <LandingPage />
  }

  return (
    <>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/product" element={<ProductPage />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/meals" element={<MealsPage />} />
              <Route path="/workouts" element={<WorkoutsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/summary/:date" element={<SummaryPage />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/meal-planning" element={<MealPlanningPage />} />
              <Route path="/grocery-lists" element={<GroceryListPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={() => {}}
        userId={user?.id}
        onComplete={completeOnboarding}
      />
      <NotificationPermissionDialog
        open={showNotificationDialog}
        onOpenChange={dismissNotificationDialog}
        onEnable={handleNotificationEnable}
      />
      <GuestRestoreDialog
        open={showGuestRestoreDialog}
        onOpenChange={dismissGuestRestoreDialog}
        onRestore={async () => {
          // This won't be called anymore, but keeping for interface compatibility
        }}
        onDismiss={dismissGuestRestoreDialog}
      />
      <ReminderScheduler />
      <InstallPrompt />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ScrollToTop />
        <AuthProvider>
          <ErrorBoundary>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
