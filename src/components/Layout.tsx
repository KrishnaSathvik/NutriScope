import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Home, UtensilsCrossed, Dumbbell, MessageSquare, Calendar, BarChart3, User, MoreHorizontal, ChefHat, CalendarDays, ShoppingCart, Trophy, UserCircle } from 'lucide-react'
import Logo from './Logo'
import { ThemeSwitcher } from './ThemeSwitcher'

export default function Layout() {
  const location = useLocation()
  const { user, isGuest, signOut } = useAuth()
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Scroll to top when route changes (additional safety for mobile)
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    })
  }, [location.pathname])

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/meals', icon: UtensilsCrossed, label: 'Meals' },
    { path: '/workouts', icon: Dumbbell, label: 'Workouts' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/recipes', icon: ChefHat, label: 'Recipes' },
    { path: '/meal-planning', icon: CalendarDays, label: 'Meal Planning' },
    { path: '/grocery-lists', icon: ShoppingCart, label: 'Grocery Lists' },
    { path: '/history', icon: Calendar, label: 'History' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/achievements', icon: Trophy, label: 'Achievements' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--color-void)' }}>
      {/* Skip Navigation Link - Hidden until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-acid focus:text-void focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:uppercase focus:tracking-wider focus:outline-none focus:ring-2 focus:ring-acid focus:ring-offset-2 focus:ring-offset-void"
      >
        Skip to main content
      </a>
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-2 md:gap-4">
            <Link to="/" className="group transition-transform hover:scale-105 active:scale-95 flex-shrink-0">
              <Logo />
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 xl:gap-1.5 text-xs font-mono uppercase tracking-wider flex-1 justify-center overflow-hidden" aria-label="Desktop navigation">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                    }}
                    className={`flex items-center gap-1 px-1.5 lg:px-2 xl:px-2.5 py-2 rounded-sm transition-all relative whitespace-nowrap ${
                      isActive
                        ? 'text-acid'
                        : 'text-dim hover:text-text'
                    }`}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0 ${isActive ? 'text-acid' : 'text-dim'}`} aria-hidden="true" />
                    <span className="hidden 2xl:inline text-[10px] lg:text-xs">{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-acid" aria-hidden="true" />
                    )}
                  </Link>
                )
              })}
            </nav>
            
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Theme Switcher */}
              <ThemeSwitcher />
              
              {isGuest && (
                <span className="hidden lg:flex items-center justify-center h-8 px-2 sm:px-3 text-xs text-dim font-mono uppercase tracking-wider border border-border bg-panel whitespace-nowrap">
                  Guest Mode
                </span>
              )}
              {user && (
                <button
                  onClick={() => signOut()}
                  className="flex items-center justify-center h-8 px-2 sm:px-3 rounded-sm bg-acid text-[#020617] dark:text-[#020617] font-mono text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-200 hover:brightness-105 active:scale-95 whitespace-nowrap"
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-border md:hidden z-40" aria-label="Mobile navigation">
        <div className="flex justify-around relative">
          {/* Show Dashboard, Meals, Workouts, Chat, Analytics, and More */}
          {[
            navItems[0], // Dashboard
            navItems[1], // Meals
            navItems[2], // Workouts
            navItems[3], // Chat
            navItems[8], // Analytics
          ].map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  setShowMoreMenu(false)
                  // Ensure scroll to top on mobile navigation
                  setTimeout(() => {
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                  }, 0)
                }}
                className={`flex flex-col items-center justify-center p-3 transition-all ${
                  isActive
                    ? 'text-acid'
                    : 'text-dim hover:text-text'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-acid glow-acid' : 'text-dim'}`} aria-hidden="true" />
                <span className="text-[10px] font-mono uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
          
          {/* More Menu Button - shows Recipes, Meal Planning, Grocery Lists, History, Achievements, Profile */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center p-3 transition-all relative ${
              (location.pathname === '/recipes' || location.pathname === '/meal-planning' || 
               location.pathname === '/grocery-lists' || location.pathname === '/history' || 
               location.pathname === '/achievements' || location.pathname === '/profile')
                ? 'text-acid'
                : 'text-dim hover:text-text'
            }`}
            aria-label="More menu"
            aria-expanded={showMoreMenu}
            aria-haspopup="true"
          >
            <MoreHorizontal className={`w-5 h-5 mb-1 ${(location.pathname === '/recipes' || location.pathname === '/meal-planning' || location.pathname === '/grocery-lists' || location.pathname === '/history' || location.pathname === '/achievements' || location.pathname === '/profile') ? 'text-acid glow-acid' : 'text-dim'}`} aria-hidden="true" />
            <span className="text-[10px] font-mono uppercase tracking-wider">More</span>
            {(location.pathname === '/recipes' || location.pathname === '/meal-planning' || 
              location.pathname === '/grocery-lists' || location.pathname === '/history' || 
              location.pathname === '/achievements' || location.pathname === '/profile') && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-acid rounded-full" aria-hidden="true"></span>
            )}
          </button>
        </div>
        
        {/* More Menu Dropdown */}
        {showMoreMenu && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 bg-black/20 -z-10"
              onClick={() => setShowMoreMenu(false)}
            />
            <div className="absolute bottom-full left-0 right-0 bg-surface border-t border-border shadow-lg mb-1 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-col">
                {[navItems[4], navItems[5], navItems[6], navItems[7], navItems[9], navItems[10]].map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  // Shorten labels for mobile
                  const mobileLabel = item.label === 'Meal Planning' ? 'Planning' 
                    : item.label === 'Grocery Lists' ? 'Grocery'
                    : item.label
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        setShowMoreMenu(false)
                        // Ensure scroll to top on mobile navigation
                        setTimeout(() => {
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                        }, 0)
                      }}
                      className={`flex items-center space-x-3 px-4 py-3 border-b border-border last:border-0 transition-all ${
                        isActive
                          ? 'bg-panel text-acid'
                          : 'text-dim hover:text-text hover:bg-panel'
                      }`}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-acid' : 'text-dim'}`} aria-hidden="true" />
                      <span className="text-sm font-mono uppercase tracking-wider">{mobileLabel}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Main Content - Full Width */}
      <main id="main-content" className="w-full pb-20 md:pb-6" role="main">
        <Outlet />
      </main>
    </div>
  )
}

