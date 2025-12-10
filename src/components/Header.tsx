import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Logo from './Logo'

interface HeaderProps {
  user?: any
}

export function Header({ user: propUser }: HeaderProps) {
  const location = useLocation()
  const { user: authUser, isGuest, signOut } = useAuth()
  
  // Use prop user if provided, otherwise use auth context user
  const user = propUser || authUser

  const isLandingPage = location.pathname === '/' || location.pathname === '/landing'
  const isAuthPage = location.pathname === '/auth'
  
  // Footer pages where we only show Dashboard button (no Create Account/Sign Out)
  const footerPages = [
    '/about',
    '/product',
    '/documentation',
    '/help',
    '/privacy',
    '/terms',
    '/cookies',
  ]
  const isFooterPage = footerPages.includes(location.pathname)
  
  // Debug: Log guest status
  // console.log('Header - isGuest:', isGuest, 'isAuthPage:', isAuthPage, 'user:', user)

  // Dashboard routes where we show: Meals, Workouts, Chat, History, Analytics, Profile
  const dashboardRoutes = [
    '/dashboard',
    '/meals',
    '/workouts',
    '/chat',
    '/history',
    '/logs',
    '/analytics',
    '/profile',
  ]
  const isDashboardRoute =
    dashboardRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/summary')

  const handleSignOut = async () => {
    await signOut()
    // Redirect handled by AuthContext
  }

  return (
    <header className="relative z-20 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between py-3 sm:py-3.5 md:py-4 gap-3 md:gap-6">
          {/* Brand */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <Link
              to="/"
              className="group transition-transform hover:scale-105 active:scale-95"
            >
              <Logo />
            </Link>
          </div>

          {/* Nav - Desktop only */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7 xl:gap-8 text-xs font-mono uppercase tracking-wider text-dim flex-1 justify-center px-4 lg:px-8">
            {user || isGuest ? (
              <>
                {isAuthPage ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="hover:text-text transition-colors px-2 py-1.5 -mx-2 -my-1.5 rounded-sm"
                    >
                      Dashboard
                    </Link>
                  </>
                ) : isDashboardRoute ? (
                  <>
                    <Link
                      to="/meals"
                      className={`hover:text-text transition-colors px-2 py-1.5 -mx-2 -my-1.5 rounded-sm ${
                        location.pathname === '/meals' ? 'text-acid' : ''
                      }`}
                    >
                      Meals
                    </Link>
                    <Link
                      to="/workouts"
                      className={`hover:text-text transition-colors px-2 py-1.5 -mx-2 -my-1.5 rounded-sm ${
                        location.pathname === '/workouts' ? 'text-acid' : ''
                      }`}
                    >
                      Workouts
                    </Link>
                    <Link
                      to="/chat"
                      className={`hover:text-text transition-colors px-2 py-1.5 -mx-2 -my-1.5 rounded-sm ${
                        location.pathname === '/chat' ? 'text-acid' : ''
                      }`}
                    >
                      Chat
                    </Link>
                    <Link
                      to="/history"
                      className={`hover:text-text transition-colors px-2 py-1.5 -mx-2 -my-1.5 rounded-sm ${
                        location.pathname === '/history' ? 'text-acid' : ''
                      }`}
                    >
                      History
                    </Link>
                    <Link
                      to="/analytics"
                      className={`hover:text-text transition-colors px-2 py-1.5 -mx-2 -my-1.5 rounded-sm ${
                        location.pathname === '/analytics' ? 'text-acid' : ''
                      }`}
                    >
                      Analytics
                    </Link>
                    <Link
                      to="/profile"
                      className={`hover:text-text transition-colors px-2 py-1.5 -mx-2 -my-1.5 rounded-sm ${
                        location.pathname === '/profile' ? 'text-acid' : ''
                      }`}
                    >
                      Profile
                    </Link>
                  </>
                ) : null}
              </>
            ) : null}
          </nav>

          {/* Actions - Right side */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-shrink-0">
            {user || isGuest ? (
              <>
                {/* On landing page, footer pages, and auth page, show Dashboard link */}
                {isLandingPage || isFooterPage || isAuthPage ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="btn-primary h-8 px-3 sm:px-4 text-[10px] sm:text-xs font-mono uppercase tracking-wider whitespace-nowrap"
                      style={{ minHeight: '2rem' }}
                    >
                      <span className="hidden sm:inline">Dashboard</span>
                      <span className="sm:hidden">Dashboard</span>
                    </Link>
                    {isGuest && isLandingPage && (
                      <Link
                        to="/auth"
                        className="btn-primary h-8 px-3 sm:px-4 text-[10px] sm:text-xs font-mono uppercase tracking-wider whitespace-nowrap"
                        style={{ minHeight: '2rem' }}
                      >
                        <span className="hidden sm:inline">Create Account</span>
                        <span className="sm:hidden">Create Account</span>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    {/* Mobile Dashboard Link - Show next to Sign Out on other pages */}
                    <Link
                      to="/dashboard"
                      className="md:hidden h-8 px-3 text-[10px] font-mono uppercase tracking-wider text-dim hover:text-text transition-colors whitespace-nowrap rounded-sm hover:bg-panel/50 flex items-center justify-center"
                      style={{ minHeight: '2rem' }}
                    >
                      Dashboard
                    </Link>
                    
                    {isGuest && !isAuthPage && (
                      <>
                        {!isLandingPage && (
                          <span className="hidden sm:inline h-8 px-3 sm:px-4 text-[10px] sm:text-xs font-mono uppercase tracking-wider text-dim border border-border bg-panel rounded-sm whitespace-nowrap flex items-center justify-center leading-none" style={{ minHeight: '2rem' }}>
                            Guest Mode
                          </span>
                        )}
                        <Link
                          to="/auth"
                          className="btn-primary h-8 px-3 sm:px-4 text-[10px] sm:text-xs font-mono uppercase tracking-wider whitespace-nowrap"
                          style={{ minHeight: '2rem' }}
                        >
                          <span className="hidden sm:inline">Create Account</span>
                          <span className="sm:hidden">Create Account</span>
                        </Link>
                      </>
                    )}
                    {!isAuthPage && (
                      <button
                        onClick={handleSignOut}
                        className="btn-secondary h-8 px-3 sm:px-4 text-[10px] sm:text-xs font-mono uppercase tracking-wider whitespace-nowrap"
                        style={{ minHeight: '2rem' }}
                      >
                        <span className="hidden sm:inline">Sign Out</span>
                        <span className="sm:hidden">Sign Out</span>
                      </button>
                    )}
                  </>
                )}
              </>
            ) : null}

          </div>
        </div>

      </div>
    </header>
  )
}

