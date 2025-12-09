import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import LandingPage from '@/pages/LandingPage'
import Dashboard from '@/pages/Dashboard'
import MealsPage from '@/pages/MealsPage'
import WorkoutsPage from '@/pages/WorkoutsPage'
import ChatPage from '@/pages/ChatPage'
import HistoryPage from '@/pages/HistoryPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SummaryPage from '@/pages/SummaryPage'
import ProfilePage from '@/pages/ProfilePage'
import RecipesPage from '@/pages/RecipesPage'
import MealPlanningPage from '@/pages/MealPlanningPage'
import GroceryListPage from '@/pages/GroceryListPage'
import AchievementsPage from '@/pages/AchievementsPage'
import AuthPage from '@/pages/AuthPage'
import AboutPage from '@/pages/AboutPage'
import CookiePolicyPage from '@/pages/CookiePolicyPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import HelpPage from '@/pages/HelpPage'
import ProductPage from '@/pages/ProductPage'
import DocumentationPage from '@/pages/DocumentationPage'

function AppRoutes() {
  const { 
    showOnboarding, 
    showNotificationDialog, 
    showGuestRestoreDialog,
    user, 
    completeOnboarding, 
    dismissNotificationDialog,
    dismissGuestRestoreDialog,
  } = useAuth()

  const handleNotificationEnable = () => {
    // Notification permission granted - user can configure reminders in settings
    dismissNotificationDialog()
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
      <BrowserRouter>
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
