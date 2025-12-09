import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  MessageSquare,
  Image as ImageIcon,
  Mic,
  Brain,
  ArrowRight,
  Zap,
  Sparkles,
  ScanLine,
  Droplet,
  BookOpen,
  Bookmark,
  Clock,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Target,
} from 'lucide-react'

export default function ProductPage() {
  const { user } = useAuth()
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
          <section className="max-w-7xl mx-auto pt-16 sm:pt-24 lg:pt-32 xl:pt-40 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32 xl:pb-40">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 text-xs text-dim font-mono bg-surface/50 border border-border rounded-full px-3 py-1.5 backdrop-blur-md mb-6">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-acid"></span>
                Product
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text mt-6 font-sans leading-[0.95]">
                Your complete health tracking solution
              </h1>

              <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto mt-6 leading-relaxed">
                NutriScope combines AI-powered logging with comprehensive analytics, recipe management, meal planning, and advanced insights. Log meals through text, voice, photos, or USDA database search. Plan weekly meals, manage recipes, and generate smart grocery lists—all in one platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center mt-8">
                <Link
                  to={user ? "/dashboard" : "/auth"}
                  className="btn-primary gap-2 group"
                >
                  <span>Get Started</span>
                  <div className="relative flex items-center justify-center w-5 h-5 bg-acid/20 rounded-full group-hover:bg-acid/30 transition-all">
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Features Overview */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4 font-sans">
                  Everything you need
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Powerful features designed to make health tracking effortless and insightful.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: MessageSquare,
                    title: 'Multi-Modal Input',
                    description: 'Log meals through text, voice, or photos. Our AI understands natural language and extracts nutrition data automatically.',
                    color: 'acid',
                  },
                  {
                    icon: ScanLine,
                    title: 'Exercise Library',
                    description: 'Browse 150+ exercises with METs values. Select exercises to auto-fill workout forms with accurate calorie calculations based on your weight.',
                    color: 'success',
                  },
                  {
                    icon: BarChart3,
                    title: 'Advanced Analytics',
                    description: 'Visualize your progress with detailed charts and trends. Multiple time ranges (7d, 30d, 3m, 1y, custom). Track calories, macros, weight, BMI, and goals over time.',
                    color: 'accent',
                  },
                  {
                    icon: Droplet,
                    title: 'Water Tracking',
                    description: 'Monitor daily water intake with customizable goals and quick-add buttons. Stay hydrated effortlessly.',
                    color: 'acid',
                  },
                  {
                    icon: BookOpen,
                    title: 'Recipe Management',
                    description: 'Create and manage recipes with ingredients and instructions. Automatic nutrition calculation and recipe scaling for different serving sizes.',
                    color: 'warning',
                  },
                  {
                    icon: Calendar,
                    title: 'Meal Planning',
                    description: 'Plan weekly meals with calendar view. Add recipes or custom meals. Generate smart grocery lists automatically from meal plans.',
                    color: 'success',
                  },
                  {
                    icon: ScanLine,
                    title: 'USDA Food Database',
                    description: 'Search 300,000+ foods from USDA FoodData Central API. Accurate nutrition data for quick meal logging. Powered by official USDA database.',
                    color: 'acid',
                  },
                  {
                    icon: Bookmark,
                    title: 'Meal Templates & Copy',
                    description: 'Save your favorite meals as templates and log them with one click. Copy previous day meals instantly. Perfect for meal prep and routines.',
                    color: 'warning',
                  },
                  {
                    icon: Clock,
                    title: 'Smart Reminders',
                    description: 'Get personalized reminders for meal logging and water intake. Never miss tracking your nutrition.',
                    color: 'accent',
                  },
                  {
                    icon: Calendar,
                    title: 'Daily Summaries & History',
                    description: 'AI-generated daily summaries with insights. Calendar view of past activity with visual indicators. Quick navigation to full summaries.',
                    color: 'success',
                  },
                  {
                    icon: TrendingUp,
                    title: 'Advanced Analytics',
                    description: 'Correlation analysis (weight vs calories, protein vs workouts), predictions, and insights. Multiple time ranges with detailed charts.',
                    color: 'acid',
                  },
                  {
                    icon: Target,
                    title: 'Achievements System',
                    description: 'Unlock achievements for streaks, goals, and milestones. Track progress and stay motivated with achievement badges.',
                    color: 'accent',
                  },
                  {
                    icon: TrendingUp,
                    title: 'Weight & Streak Tracking',
                    description: 'Track daily weight with BMI calculation and trends. Monitor logging streaks to stay motivated. Body composition tracking with goal lines.',
                    color: 'warning',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Privacy First',
                    description: 'Your health data is encrypted and secure. Row Level Security (RLS) ensures data isolation. We never share your information with third parties.',
                    color: 'error',
                  },
                ].map((feature, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <div className={`flex w-12 h-12 rounded-sm items-center justify-center mb-4 ${
                      feature.color === 'acid' ? 'bg-acid/20 border border-acid/30' :
                      feature.color === 'success' ? 'bg-success/20 border border-success/30' :
                      feature.color === 'accent' ? 'bg-accent/20 border border-accent/30' :
                      feature.color === 'warning' ? 'bg-warning/20 border border-warning/30' :
                      'bg-error/20 border border-error/30'
                    }`}>
                      <feature.icon className={`h-6 w-6 ${
                        feature.color === 'acid' ? 'text-acid' :
                        feature.color === 'success' ? 'text-success' :
                        feature.color === 'accent' ? 'text-accent' :
                        feature.color === 'warning' ? 'text-warning' :
                        'text-error'
                      }`} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-text mb-2 font-mono uppercase">{feature.title}</h3>
                    <p className="text-sm text-dim font-mono leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Input Methods */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4 font-sans">
                  How it works
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Choose the input method that works best for you. Our AI handles the rest.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    icon: MessageSquare,
                    title: 'Text Input',
                    description: 'Simply type what you ate or your workout details. Our AI parses natural language.',
                    example: 'I had 2 eggs and toast for breakfast',
                    color: 'acid',
                  },
                  {
                    icon: ImageIcon,
                    title: 'Photo Upload',
                    description: 'Take a photo of your meal and let our vision AI identify and calculate nutrition automatically.',
                    example: 'Upload meal photo',
                    color: 'accent',
                  },
                  {
                    icon: Mic,
                    title: 'Voice Input',
                    description: 'Speak naturally and our voice AI transcribes and analyzes your meal or workout information.',
                    example: 'Just finished a 30-minute run',
                    color: 'success',
                  },
                  {
                    icon: ScanLine,
                    title: 'USDA Food Database',
                    description: 'Search 300,000+ foods from USDA FoodData Central. Accurate nutrition data for quick meal logging. Enter meal details manually or search database.',
                    example: 'Search "chicken breast"',
                    color: 'warning',
                  },
                ].map((method, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300 text-center">
                    <div className={`flex w-16 h-16 rounded-sm items-center justify-center mx-auto mb-4 ${
                      method.color === 'acid' ? 'bg-acid/20 border border-acid/30' :
                      method.color === 'accent' ? 'bg-accent/20 border border-accent/30' :
                      method.color === 'success' ? 'bg-success/20 border border-success/30' :
                      'bg-warning/20 border border-warning/30'
                    }`}>
                      <method.icon className={`h-8 w-8 ${
                        method.color === 'acid' ? 'text-acid' :
                        method.color === 'accent' ? 'text-accent' :
                        method.color === 'success' ? 'text-success' :
                        'text-warning'
                      }`} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-text mb-2 font-mono uppercase">{method.title}</h3>
                    <p className="text-sm text-dim font-mono mb-4 leading-relaxed">{method.description}</p>
                    <div className="bg-surface/50 backdrop-blur-sm rounded-sm p-4 border border-border">
                      <p className="text-sm text-dim font-mono italic">{method.example}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI Features */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4 font-sans">
                  Powered by AI
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Our advanced AI understands context, remembers your preferences, and provides intelligent insights.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    icon: Brain,
                    title: 'Smart Parsing',
                    description: 'Our AI extracts calories, macros, and nutrition data from natural language descriptions, even when you\'re informal or brief.',
                    color: 'success',
                  },
                  {
                    icon: Sparkles,
                    title: 'Personalized Responses',
                    description: 'The AI remembers your goals, dietary preferences, and activity level to provide relevant advice and answers to your questions.',
                    color: 'accent',
                  },
                  {
                    icon: Zap,
                    title: 'Instant Analysis',
                    description: 'Get immediate feedback on your meals and workouts. Ask questions and receive contextual answers based on your data.',
                    color: 'warning',
                  },
                  {
                    icon: Droplet,
                    title: 'Water Tracking',
                    description: 'Monitor daily water intake with customizable goals, quick-add buttons, and progress visualization.',
                    color: 'acid',
                  },
                  {
                    icon: BookOpen,
                    title: 'Meal Templates',
                    description: 'Save your favorite meals as reusable templates. Log common meals with one click. Copy previous day meals instantly.',
                    color: 'success',
                  },
                  {
                    icon: Clock,
                    title: 'Smart Reminders',
                    description: 'Get personalized reminders for meal logging and water intake. Never miss tracking your nutrition goals.',
                    color: 'warning',
                  },
                  {
                    icon: BarChart3,
                    title: 'Advanced Analytics & Achievements',
                    description: 'AI-generated daily summaries with insights. Comprehensive analytics with correlations, predictions, and multiple time ranges. Unlock achievements for streaks, goals, and milestones.',
                    color: 'accent',
                  },
                  {
                    icon: BookOpen,
                    title: 'Recipe & Meal Planning',
                    description: 'Create recipes with automatic nutrition calculation. Plan weekly meals with calendar view. Generate smart grocery lists from meal plans.',
                    color: 'success',
                  },
                ].map((feature, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`flex w-12 h-12 rounded-sm items-center justify-center ${
                        feature.color === 'success' ? 'bg-success/20 border border-success/30' :
                        feature.color === 'accent' ? 'bg-accent/20 border border-accent/30' :
                        feature.color === 'warning' ? 'bg-warning/20 border border-warning/30' :
                        'bg-acid/20 border border-acid/30'
                      }`}>
                        <feature.icon className={`h-6 w-6 ${
                          feature.color === 'success' ? 'text-success' :
                          feature.color === 'accent' ? 'text-accent' :
                          feature.color === 'warning' ? 'text-warning' :
                          'text-acid'
                        }`} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight text-text font-mono uppercase">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-dim font-mono leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Use Cases Section */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4 font-sans">
                  Who is NutriScope for?
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Whether you're looking to lose weight, build muscle, or simply maintain a healthy lifestyle, NutriScope adapts to your needs.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    title: 'Fitness Enthusiasts',
                    items: [
                      'Track macros and calories precisely',
                      'Monitor workout performance',
                      'Set and achieve fitness goals',
                      'Get personalized nutrition advice',
                    ],
                  },
                  {
                    title: 'Health Conscious Individuals',
                    items: [
                      'Maintain balanced nutrition',
                      'Track daily activity levels',
                      'Understand eating patterns',
                      'Make informed health decisions',
                    ],
                  },
                ].map((useCase, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <h3 className="text-2xl font-bold tracking-tight text-text mb-6 font-sans">{useCase.title}</h3>
                    <ul className="space-y-3">
                      {useCase.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-dim font-mono leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
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
