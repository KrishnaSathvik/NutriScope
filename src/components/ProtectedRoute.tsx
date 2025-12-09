import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute() {
  const { user, isGuest, loading } = useAuth()
  const location = useLocation()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-dim font-mono text-sm">Loading...</div>
      </div>
    )
  }

  // If user is not authenticated (not logged in and not in guest mode), redirect to landing page
  if (!user && !isGuest) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // User is authenticated (either logged in or in guest mode), allow access
  return <Outlet />
}

