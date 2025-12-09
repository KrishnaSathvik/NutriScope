import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowRight,
  ScanLine,
  LineChart,
  Timer,
  CheckCircle2,
  Zap,
  UtensilsCrossed,
  Dumbbell,
  Target,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Flame,
  Beef,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { GuestDataDialog } from '@/components/GuestDataDialog'

export default function LandingPage() {
  const { user, isGuest, loading, signInAnonymously } = useAuth()
  const navigate = useNavigate()
  const [showGuestDialog, setShowGuestDialog] = useState(false)
  const [hasGuestData, setHasGuestData] = useState(false)

  // Check for guest data on mount
  useEffect(() => {
    if (!user && !isGuest && !loading) {
      const storedGuestUserId = localStorage.getItem('nutriscope_guest_user_id')
      const hasGuestDataFlag = localStorage.getItem('nutriscope_has_guest_data')
      if (storedGuestUserId && hasGuestDataFlag === 'true') {
        setHasGuestData(true)
      }
    }
  }, [user, isGuest, loading])

  const handleGetStarted = (e: React.MouseEvent) => {
    // If user is already signed in, let Link handle navigation
    if (user || isGuest) {
      return
    }

    // Check for guest data
    const storedGuestUserId = localStorage.getItem('nutriscope_guest_user_id')
    const hasGuestDataFlag = localStorage.getItem('nutriscope_has_guest_data')
    
    if (storedGuestUserId && hasGuestDataFlag === 'true') {
      e.preventDefault()
      setShowGuestDialog(true)
    }
    // Otherwise, let Link navigate to /auth normally
  }

  const handleContinueAsGuest = async () => {
    try {
      // Clear the old guest user ID since we're starting fresh
      localStorage.removeItem('nutriscope_guest_user_id')
      localStorage.removeItem('nutriscope_has_guest_data')
      
      // Create new guest session
      await signInAnonymously()
      navigate('/dashboard')
    } catch (error) {
      console.error('Error signing in as guest:', error)
      navigate('/auth')
    }
  }

  const handleCreateAccount = () => {
    // Store the old guest user ID for migration during sign up
    const storedGuestUserId = localStorage.getItem('nutriscope_guest_user_id')
    if (storedGuestUserId) {
      // Keep it in localStorage - AuthPage will handle migration
      navigate('/auth')
    } else {
      navigate('/auth')
    }
  }

  // Allow authenticated users to view landing page (no redirect)
  // They can navigate back to dashboard using the header navigation

  return (
    <div className="min-h-screen bg-void relative">
      {/* Background */}
      <div className="fixed top-0 w-full -z-10 h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-void via-acid/5 to-acid/10"></div>
      </div>

      <div className="relative z-20">
        <Header />

        {/* Hero Section */}
        <main className="relative">
          <div className="max-w-7xl mx-auto pt-12 sm:pt-16 lg:pt-20 xl:pt-24 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 lg:pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 xl:gap-20 items-center">
              {/* Left: Copy */}
              <section className="order-1 lg:order-1 relative">
                <div className="inline-flex items-center gap-2 text-xs text-dim font-mono bg-surface/50 border border-border rounded-full px-3 py-1.5 backdrop-blur-md mb-6">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  </div>
                  Real‑time Health Platform
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text mt-6 font-sans leading-[0.95]">
                  Health tracking, simplified.
                </h1>

                <p className="text-base sm:text-lg text-dim font-mono max-w-xl mt-6 leading-relaxed">
                  Track meals, plan your week, manage recipes, and achieve your fitness goals with AI-powered insights—all in one comprehensive platform.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 items-center mt-8">
                  <Link
                    to={user || isGuest ? "/dashboard" : "/auth"}
                    onClick={handleGetStarted}
                    className="btn-primary gap-2 group"
                  >
                    <span>Get Started</span>
                    <div className="relative flex items-center justify-center w-5 h-5 bg-acid/20 rounded-full group-hover:bg-acid/30 transition-all">
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </div>

                {/* Divider */}
                <div className="h-px bg-border mt-6 sm:mt-8"></div>

                {/* Feature bullets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mt-8">
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-surface/50 border border-border rounded-sm items-center justify-center mt-0.5">
                      <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-acid" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text font-mono uppercase">Unified tracking</p>
                      <p className="text-xs sm:text-sm text-dim font-mono mt-0.5">Meals, workouts, recipes, and planning in one place.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-surface/50 border border-border rounded-sm items-center justify-center mt-0.5">
                      <LineChart className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text font-mono uppercase">Advanced analytics</p>
                      <p className="text-xs sm:text-sm text-dim font-mono mt-0.5">Correlations, predictions, and insights.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-surface/50 border border-border rounded-sm items-center justify-center mt-0.5">
                      <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-acid" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text font-mono uppercase">AI-powered</p>
                      <p className="text-xs sm:text-sm text-dim font-mono mt-0.5">Voice, image, and natural language logging.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right: Visual */}
              <section className="order-2 lg:order-2 relative">
                {/* Colorful background glow */}
                <div className="absolute -inset-6 sm:-inset-10 pointer-events-none">
                  <div className="absolute right-6 sm:right-10 top-0 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-acid/20 blur-3xl"></div>
                  <div className="absolute left-2 sm:left-5 top-12 sm:top-20 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-success/20 blur-3xl"></div>
                  <div className="absolute right-0 bottom-6 sm:bottom-10 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-accent/20 blur-3xl"></div>
                </div>

                {/* Dashboard Card */}
                <div className="relative z-10 max-w-lg sm:max-w-xl lg:mx-0 lg:ml-auto mx-auto card-modern p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase text-dim">Dashboard Overview</span>
                    <div className="flex items-center gap-2 text-xs text-dim">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/20 border border-success/30 px-2 py-1 text-success font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card-modern p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-500/20 border border-orange-500/30 rounded-sm flex items-center justify-center">
                          <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 stroke-orange-500 stroke-2" />
                        </div>
                        <span className="text-xs text-success font-mono font-bold">+12%</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-dim font-mono uppercase mb-1">Calories</p>
                      <p className="text-lg sm:text-xl font-bold text-orange-500 font-mono tracking-tight">2,340</p>
                    </div>
                    <div className="card-modern p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-sm flex items-center justify-center">
                          <Beef className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-success stroke-emerald-600 dark:stroke-success stroke-2" />
                        </div>
                        <span className="text-xs text-success font-mono font-bold">+8%</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-dim font-mono uppercase mb-1">Protein</p>
                      <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-success font-mono tracking-tight">145g</p>
                    </div>
                    <div className="card-modern p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/20 border border-amber-500/30 rounded-sm flex items-center justify-center">
                          <UtensilsCrossed className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-acid stroke-amber-600 dark:stroke-acid stroke-2" />
                        </div>
                        <span className="text-xs text-dim font-mono font-bold">+24</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-dim font-mono uppercase mb-1">Meals Logged</p>
                      <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-text font-mono tracking-tight">47</p>
                    </div>
                    <div className="card-modern p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500/20 border border-indigo-500/30 rounded-sm flex items-center justify-center">
                          <Target className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-success stroke-indigo-600 dark:stroke-success stroke-2" />
                        </div>
                        <span className="text-xs text-success font-mono font-bold">+18%</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-dim font-mono uppercase mb-1">Goal Progress</p>
                      <p className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-text font-mono tracking-tight">87%</p>
                    </div>
                  </div>

                  {/* Divider inside card */}
                  <div className="h-px bg-border mt-3"></div>

                  {/* Period labels */}
                  <div className="mt-3 flex justify-between items-center text-[10px] sm:text-xs text-dim">
                    <span className="font-mono">Today</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-text font-mono">
                      <ArrowRight className="w-3 h-3" />
                      View Details
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* AI Features Section */}
        <section className="border-t border-border relative bg-surface/30">
          <div className="max-w-7xl mx-auto pt-12 sm:pt-16 lg:pt-20 px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-20">
            <div>
              <p className="text-xs sm:text-sm text-dim font-mono uppercase tracking-wider">
                Intelligent health automation
              </p>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text mt-4 font-sans">
                Transform your workflow
                <span className="block text-dim">with AI-powered insights</span>
              </h2>
            </div>

            {/* Cards Grid */}
            <div className="mt-8 sm:mt-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1 */}
                <article className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                  <h3 className="text-xl sm:text-2xl font-bold text-text font-mono uppercase mb-2">Multi-Modal Meal Logging</h3>
                  <p className="text-sm sm:text-base text-dim font-mono leading-relaxed">
                    Log meals through text, voice, photos, or USDA food database search (300,000+ foods). Our AI understands natural language and extracts nutrition data automatically. Edit meals, use templates, or copy previous days.
                  </p>
                  <div className="mt-6 flex items-center gap-3 text-xs sm:text-sm flex-wrap">
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface/50 border border-border px-2 sm:px-3 py-1">
                      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-acid" />
                      <span className="font-mono text-text">Text & Voice</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface/50 border border-border px-2 sm:px-3 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
                    <span className="font-mono text-text">USDA Database</span>
                  </span>
                </div>
              </article>

                {/* Card 2 */}
                <article className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                  <h3 className="text-xl sm:text-2xl font-bold text-text font-mono uppercase mb-2">Recipe & Meal Planning</h3>
                  <p className="text-sm sm:text-base text-dim font-mono leading-relaxed">
                    Create and manage recipes with automatic nutrition calculation. Plan weekly meals with our calendar view. Generate smart grocery lists from meal plans with automatic ingredient aggregation.
                  </p>
                  <div className="mt-6 flex items-center gap-3 text-xs sm:text-sm flex-wrap">
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface/50 border border-border px-2 sm:px-3 py-1">
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-acid" />
                      <span className="font-mono text-text">Recipe Scaling</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface/50 border border-border px-2 sm:px-3 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                    <span className="font-mono text-text">Smart Lists</span>
                  </span>
                </div>
              </article>

                {/* Card 3 */}
                <article className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                  <h3 className="text-xl sm:text-2xl font-bold text-text font-mono uppercase mb-2">Advanced Analytics & Achievements</h3>
                  <p className="text-sm sm:text-base text-dim font-mono leading-relaxed">
                    Track progress with correlations (weight vs calories, protein vs workouts), predictions, and insights. Unlock achievements for streaks, goals, and milestones. Multiple time ranges (7d to 1 year) with detailed charts.
                  </p>
                  <div className="mt-6 flex items-center gap-3 text-xs sm:text-sm flex-wrap">
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface/50 border border-border px-2 sm:px-3 py-1">
                      <LineChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
                      <span className="font-mono text-text">Correlations</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface/50 border border-border px-2 sm:px-3 py-1">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-acid" />
                    <span className="font-mono text-text">Achievements</span>
                  </span>
                </div>
              </article>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="border-t border-border relative bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left: Copy */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface/50 border border-border px-3 py-1.5 text-[10px] sm:text-xs text-dim font-mono uppercase tracking-wider mb-4 sm:mb-6">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  </div>
                  Product workflow
                </div>
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text font-sans">
                  From meals to insights
                </h2>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-dim font-mono max-w-xl leading-relaxed">
                  Log, analyze, and optimize—end‑to‑end health tracking in three simple steps.
                </p>

                {/* Steps */}
                <div className="mt-8 space-y-8 sm:space-y-10">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span className="select-none leading-none text-5xl sm:text-6xl md:text-7xl font-bold text-acid/30 font-mono w-12 sm:w-16 text-center">1</span>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-text font-mono uppercase tracking-tight">Log</p>
                      <p className="mt-1 text-sm sm:text-base text-dim font-mono leading-relaxed">Track meals with text, voice, photos, or USDA database search. Use templates, edit entries, copy previous days, or plan weekly meals—no spreadsheets.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span className="select-none leading-none text-5xl sm:text-6xl md:text-7xl font-bold text-acid/30 font-mono w-12 sm:w-16 text-center">2</span>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-text font-mono uppercase tracking-tight">Plan</p>
                      <p className="mt-1 text-sm sm:text-base text-dim font-mono leading-relaxed">Create recipes, plan weekly meals, and generate smart grocery lists. Scale recipes for different serving sizes automatically.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span className="select-none leading-none text-5xl sm:text-6xl md:text-7xl font-bold text-acid/30 font-mono w-12 sm:w-16 text-center">3</span>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-text font-mono uppercase tracking-tight">Analyze</p>
                      <p className="mt-1 text-sm sm:text-base text-dim font-mono leading-relaxed">Advanced analytics with correlations, predictions, and insights. Unlock achievements and track progress across multiple time ranges.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Visual */}
              <div className="relative lg:justify-self-end">
                <div className="absolute -right-6 -top-8 bg-acid/20 w-40 h-40 rounded-full blur-3xl"></div>
                <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-success/20 blur-3xl"></div>
                <div className="relative">
                  <div className="card-modern p-6 sm:p-8 relative overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="card-modern p-3 sm:p-4">
                        <UtensilsCrossed className="w-6 h-6 sm:w-8 sm:h-8 text-acid mb-2" />
                        <p className="text-text font-mono text-xs sm:text-sm font-bold uppercase">Meal Logged</p>
                      </div>
                      <div className="card-modern p-3 sm:p-4">
                        <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-success mb-2" />
                        <p className="text-text font-mono text-xs sm:text-sm font-bold uppercase">Analytics</p>
                      </div>
                      <div className="card-modern p-3 sm:p-4">
                        <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-acid mb-2" />
                        <p className="text-text font-mono text-xs sm:text-sm font-bold uppercase">Progress</p>
                      </div>
                      <div className="card-modern p-3 sm:p-4">
                        <Target className="w-6 h-6 sm:w-8 sm:h-8 text-success mb-2" />
                        <p className="text-text font-mono text-xs sm:text-sm font-bold uppercase">Goals</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* Guest Data Dialog */}
      <GuestDataDialog
        open={showGuestDialog}
        onOpenChange={setShowGuestDialog}
        onContinueAsGuest={handleContinueAsGuest}
        onCreateAccount={handleCreateAccount}
      />
    </div>
  )
}
