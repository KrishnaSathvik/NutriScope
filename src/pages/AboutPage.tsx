import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  ScanLine,
  Plug,
  Users,
  Heart,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function AboutPage() {
  const { user, isGuest } = useAuth()

  // This page should be accessible to everyone

  return (
    <div className="min-h-screen bg-void relative">
      {/* Background */}
      <div className="fixed top-0 w-full -z-10 h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-void via-acid/5 to-acid/10"></div>
      </div>

      <div className="relative z-20">
        <Header />

        <main className="relative">
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto pt-16 md:pt-24 lg:pt-32 px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 text-xs text-dim font-mono bg-surface/50 border border-border rounded-full px-3 py-1.5 backdrop-blur-md mb-6">
                <div className="flex items-center gap-1">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                </div>
                About NutriScope
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-text tracking-tighter mt-6 font-sans leading-[0.95]">
                Our mission: make health tracking effortless
              </h1>

              <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto mt-6 leading-relaxed">
                We built NutriScope to solve a simple problem: health tracking shouldn't be complicated. With AI-powered logging and comprehensive analytics, we're making it easier than ever to understand and improve your health.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center mt-8">
                <Link
                  to={user || isGuest ? "/dashboard" : "/auth"}
                  className="btn-primary gap-2 group"
                >
                  <span>Get Started</span>
                  <div className="relative flex items-center justify-center w-5 h-5 bg-acid/20 dark:bg-acid/30 rounded-full group-hover:bg-acid/30 dark:group-hover:bg-acid/40 transition-all">
                    <ArrowRight className="w-3.5 h-3.5 text-current transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-on-acid)' }} />
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Our Goal Section */}
          <section className="border-t border-border relative bg-surface/30">
            <div className="max-w-7xl mx-auto pt-16 md:pt-24 px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
                  Our Goal
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  We're on a mission to make health tracking accessible, intelligent, and truly useful for everyone.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {[
                  {
                    icon: Target,
                    title: "Simplify Health Tracking",
                    description: "Remove the friction from logging meals and workouts. Our AI understands natural language, so you can track your health the way you think about it.",
                    color: "acid",
                  },
                  {
                    icon: BarChart3,
                    title: "Provide Actionable Insights",
                    description: "Transform raw data into meaningful insights. Understand your patterns, identify trends, and make informed decisions about your health.",
                    color: "success",
                  },
                  {
                    icon: Heart,
                    title: "Empower Better Choices",
                    description: "Give you the tools and information you need to make healthier choices every day, without the complexity of traditional tracking apps.",
                    color: "accent",
                  },
                ].map((goal, i) => (
                  <div
                    key={i}
                    className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300"
                  >
                    <div className={`flex w-12 h-12 md:w-14 md:h-14 rounded-sm items-center justify-center mb-4 ${
                      goal.color === "acid" ? "bg-indigo-500/20 border border-indigo-500/30" :
                      goal.color === "success" ? "bg-emerald-500/20 border border-emerald-500/30" :
                      "bg-orange-500/20 border border-orange-500/30"
                    }`}>
                      <goal.icon className={`h-6 w-6 md:h-7 md:w-7 ${
                        goal.color === "acid" ? "text-indigo-500 stroke-indigo-500 dark:text-indigo-400 dark:stroke-indigo-400" :
                        goal.color === "success" ? "text-emerald-500 stroke-emerald-500 dark:text-emerald-400 dark:stroke-emerald-400" :
                        "text-orange-500 stroke-orange-500 dark:text-orange-400 dark:stroke-orange-400"
                      } stroke-2 fill-none`} />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-text mb-2 font-mono uppercase">
                      {goal.title}
                    </h3>
                    <p className="text-sm md:text-base text-dim font-mono leading-relaxed">
                      {goal.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why We Built This Section */}
          <section className="border-t border-border relative bg-surface/30">
            <div className="max-w-7xl mx-auto pt-16 md:pt-24 px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
                  Why We Built This
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Traditional health tracking apps are clunky, time-consuming, and often abandoned. We saw a better way.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {[
                  {
                    title: "The Problem",
                    items: [
                      "Existing apps require manual data entry for every meal",
                      "Complex interfaces make tracking feel like a chore",
                      "Limited AI capabilities mean you're doing most of the work",
                      "Fragmented data across multiple apps and platforms",
                      "No intelligent insights to help you understand your patterns",
                      "Can't edit entries - must delete and recreate",
                      "No way to quickly copy previous days",
                    ],
                    color: "error",
                  },
                  {
                    title: "Our Solution",
                    items: [
                      "AI-powered natural language processing for effortless meal and workout logging",
                      "Multi-modal input: text, voice, photos with OpenAI Whisper & Vision",
                      "USDA Food Database integration - search 300,000+ foods with accurate nutrition",
                      "Simplified recipe management: name, servings, instructions, and nutrition",
                      "Save recipes as meal templates for quick logging",
                      "Favorite recipes for quick access",
                      "Weekly meal planning with calendar view (Monday-Sunday)",
                      "Smart grocery list with search, autocomplete, and auto-categorization",
                      "Real-world grocery format: simple quantity and name (e.g., '2x Eggs')",
                      "Comprehensive analytics with line charts, area charts, and correlations",
                      "Weight vs Calories and Protein vs Workouts correlation analysis",
                      "Weight predictions and trend analysis",
                      "Achievement system with streaks, goals, and milestones",
                      "All-in-one platform: nutrition, workouts, water, weight tracking",
                      "Intelligent chat assistant with voice, image, and auto-logging",
                      "Deep AI personalization using user profile data for tailored responses",
                      "Edit meals and workouts - no need to delete and recreate",
                      "Copy previous day meals with one-click selection",
                      "Exercise library with 150+ exercises and METs-based calorie calculation",
                      "Weight tracking with BMI, trends, and body composition",
                      "Streak tracking to keep you motivated",
                      "Complete guest mode with seamless data migration",
                      "Performance monitoring with Web Vitals tracking",
                      "Google Analytics integration for user engagement insights",
                      "Code splitting for faster page loads",
                      "Accessibility improvements (ARIA labels, skip navigation)",
                      "Expanded reminder system (meals, water, workouts, goals, weight, streak, daily summary)",
                    ],
                    color: "success",
                  },
                ].map((section, i) => (
                  <div
                    key={i}
                    className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300"
                  >
                    <h3 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 font-mono uppercase ${
                      section.color === "error" ? "text-error" : "text-success"
                    }`}>
                      {section.title}
                    </h3>
                    <ul className="space-y-3">
                      {section.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          {section.color === "error" ? (
                            <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400 stroke-red-500 dark:stroke-red-400 stroke-2" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-500 fill-emerald-500 dark:text-emerald-400 dark:fill-emerald-400 stroke-emerald-500 dark:stroke-emerald-400 stroke-2" />
                          )}
                          <span className="text-sm md:text-base text-dim font-mono leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Integration & Compatibility Section */}
          <section className="border-t border-border relative bg-surface/30">
            <div className="max-w-7xl mx-auto pt-16 md:pt-24 px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
                  Works With Your Existing Tools
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  NutriScope is designed to complement and enhance your existing health and fitness ecosystem.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[
                  {
                    icon: Plug,
                    title: "Supabase Backend",
                    description: "Secure, scalable backend infrastructure with PostgreSQL, Row Level Security, and anonymous authentication. Your data is encrypted and stored safely.",
                    color: "warning",
                  },
                  {
                    icon: MessageSquare,
                    title: "AI Chat Integration",
                    description: "Our intelligent chat assistant can answer questions about your health data, provide meal suggestions, and offer personalized advice based on your goals and history.",
                    color: "accent",
                  },
                  {
                    icon: ScanLine,
                    title: "Exercise Library",
                    description: "Browse 150+ exercises with METs values for accurate calorie calculation. Select exercises to auto-fill workout forms with calculated calories.",
                    color: "success",
                  },
                  {
                    icon: Zap,
                    title: "OpenAI Integration",
                    description: "Powered by GPT-4o-mini for chat, Whisper for voice transcription, and Vision for image analysis. Advanced AI understands context and executes actions automatically.",
                    color: "acid",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Secure Data Storage",
                    description: "Your health data is encrypted and stored securely. Export your data anytime, or keep it private with our privacy-first approach.",
                    color: "success",
                  },
                  {
                    icon: Users,
                    title: "Guest Mode",
                    description: "Try NutriScope without creating an account. Use anonymous authentication to access all features, then seamlessly migrate your data when you're ready to sign up.",
                    color: "accent",
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300"
                  >
                    <div className={`flex w-12 h-12 md:w-14 md:h-14 rounded-sm items-center justify-center mb-4 ${
                      feature.color === "warning" ? "bg-amber-500/20 border border-amber-500/30" :
                      feature.color === "accent" ? "bg-orange-500/20 border border-orange-500/30" :
                      feature.color === "success" ? "bg-emerald-500/20 border border-emerald-500/30" :
                      "bg-indigo-500/20 border border-indigo-500/30"
                    }`}>
                      <feature.icon className={`h-6 w-6 md:h-7 md:w-7 ${
                        feature.color === "warning" ? "text-amber-500 stroke-amber-500 dark:text-amber-400 dark:stroke-amber-400" :
                        feature.color === "accent" ? "text-orange-500 stroke-orange-500 dark:text-orange-400 dark:stroke-orange-400" :
                        feature.color === "success" ? "text-emerald-500 stroke-emerald-500 dark:text-emerald-400 dark:stroke-emerald-400" :
                        "text-indigo-500 stroke-indigo-500 dark:text-indigo-400 dark:stroke-indigo-400"
                      } stroke-2 fill-none`} />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-text mb-2 font-mono uppercase">
                      {feature.title}
                    </h3>
                    <p className="text-sm md:text-base text-dim font-mono leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </div>
  )
}

