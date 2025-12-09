import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  BookOpen,
  Utensils,
  Dumbbell,
  BarChart3,
  MessageSquare,
  ScanLine,
  Mic,
  Image as ImageIcon,
  Droplet,
  BookMarked,
  Clock,
  CheckCircle2,
  TrendingUp,
  Target,
  Calendar,
} from 'lucide-react'

export default function DocumentationPage() {
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
                <div className="flex items-center gap-1">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                </div>
                Documentation
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text mt-6 font-sans leading-[0.95]">
                Complete user guides for all features
              </h1>

              <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto mt-6 leading-relaxed">
                Learn how to use every feature in NutriScope. From meal logging to analytics, we've got you covered.
              </p>
            </div>
          </section>

          {/* Meal Logging Guide */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Utensils className="h-8 w-8 text-indigo-500 stroke-indigo-500 dark:text-indigo-400 dark:stroke-indigo-400 stroke-2 fill-none" />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text font-sans">
                    Meal Logging
                  </h2>
                </div>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Track your meals using multiple input methods: text, voice, photos, or USDA food database search (300,000+ foods). Edit meals anytime, use templates, copy previous days, or search the official USDA database. Our AI understands natural language and extracts nutrition data automatically.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: MessageSquare,
                    title: 'Text Input',
                    description: "Type what you ate in natural language. Examples: '2 eggs and toast', 'grilled chicken breast with rice'",
                    steps: [
                      'Go to the Meals tab',
                      "Click 'Add Meal'",
                      'Type your meal description',
                      'AI automatically extracts nutrition data',
                    ],
                    color: 'acid',
                  },
                  {
                    icon: Mic,
                    title: 'Voice Input',
                    description: 'Speak your meal naturally. Our voice AI transcribes and analyzes your description.',
                    steps: [
                      'Click the microphone icon',
                      'Speak your meal description',
                      'Wait for transcription',
                      'Review and confirm the extracted data',
                    ],
                    color: 'success',
                  },
                  {
                    icon: ImageIcon,
                    title: 'Photo Upload',
                    description: 'Take a photo of your meal. Our vision AI identifies food items and estimates portions.',
                    steps: [
                      'Click the camera icon',
                      'Take or upload a photo',
                      'AI identifies food items',
                      'Adjust portions if needed',
                    ],
                    color: 'accent',
                  },
                  {
                    icon: BookOpen,
                    title: 'USDA Food Database',
                    description: 'Search 300,000+ foods from USDA FoodData Central API. Accurate nutrition data for quick meal logging.',
                    steps: [
                      'Click "Search Food Database" button',
                      'Type food name (e.g., "chicken breast")',
                      'Browse search results',
                      'Select food to auto-fill nutrition data',
                    ],
                    color: 'warning',
                  },
                  {
                    icon: BookMarked,
                    title: 'Meal Templates & Copy',
                    description: 'Save frequently eaten meals as templates. Use templates or copy previous day meals for quick logging.',
                    steps: [
                      'Log a meal normally',
                      'Click "Save Template" button',
                      'Name your template',
                      'Use template anytime with one click',
                      'Or copy all meals from yesterday instantly',
                    ],
                    color: 'accent',
                  },
                ].map((method, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <div className={`flex w-12 h-12 rounded-sm items-center justify-center mb-4 ${
                      method.color === 'acid' ? 'bg-indigo-500/20 border border-indigo-500/30' :
                      method.color === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                      method.color === 'accent' ? 'bg-orange-500/20 border border-orange-500/30' :
                      'bg-amber-500/20 border border-amber-500/30'
                    }`}>
                      <method.icon className={`h-6 w-6 ${
                        method.color === 'acid' ? 'text-indigo-500 stroke-indigo-500 dark:text-indigo-400 dark:stroke-indigo-400' :
                        method.color === 'success' ? 'text-emerald-500 stroke-emerald-500 dark:text-emerald-400 dark:stroke-emerald-400' :
                        method.color === 'accent' ? 'text-orange-500 stroke-orange-500 dark:text-orange-400 dark:stroke-orange-400' :
                        'text-amber-500 stroke-amber-500 dark:text-amber-400 dark:stroke-amber-400'
                      } stroke-2 fill-none`} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-text mb-2 font-mono uppercase">{method.title}</h3>
                    <p className="text-sm text-dim font-mono mb-4 leading-relaxed">{method.description}</p>
                    <ul className="space-y-2">
                      {method.steps.map((step, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500 fill-emerald-500 dark:text-emerald-400 dark:fill-emerald-400 stroke-emerald-500 dark:stroke-emerald-400 stroke-2" />
                          <span className="text-xs text-dim font-mono">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Workout Logging Guide */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Dumbbell className="h-8 w-8 text-orange-500 stroke-orange-500 dark:text-orange-400 dark:stroke-orange-400 stroke-2 fill-none" />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text font-sans">
                    Workout Logging
                  </h2>
                </div>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Track your exercises and workouts. Log sets, reps, weights, and duration to monitor your fitness progress.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    title: 'Adding a Workout',
                    items: [
                      'Navigate to the Workouts tab',
                      "Click 'Log Workout' or use the exercise library browser",
                      'Select an exercise from the library (150+ exercises)',
                      'Or manually enter exercise name, type, duration, and calories',
                      'Exercise library auto-calculates calories using METs formula',
                      'Edit or delete workouts anytime',
                      'Review and save your workout',
                    ],
                  },
                  {
                    title: 'Exercise Library',
                    items: [
                      'Click "Browse" button in workout form',
                      'Search exercises by name or filter by type',
                      'Select an exercise to auto-fill the form',
                      'Calories calculated automatically based on your weight and duration',
                      'METs-based calculation ensures accuracy',
                      'All workouts are saved to your history',
                    ],
                  },
                ].map((section, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <h3 className="text-2xl font-bold tracking-tight text-text mb-6 font-sans">{section.title}</h3>
                    <ul className="space-y-3">
                      {section.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500 dark:text-emerald-400 dark:fill-emerald-400 stroke-emerald-500 dark:stroke-emerald-400 stroke-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-dim font-mono leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Analytics Guide */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <BarChart3 className="h-8 w-8 text-emerald-500 stroke-emerald-500 dark:text-emerald-400 dark:stroke-emerald-400 stroke-2 fill-none" />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text font-sans">
                    Analytics & Insights
                  </h2>
                </div>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Understand your health data with comprehensive analytics, charts, and trends.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: BarChart3,
                    title: 'Nutrition Charts',
                    description: 'View calorie and macro trends over time. Multiple time ranges: 7 days, 30 days, 3 months, 1 year, or custom range. Track your daily, weekly, and monthly progress.',
                    color: 'success',
                  },
                  {
                    icon: TrendingUp,
                    title: 'Weight & BMI Tracking',
                    description: 'Monitor weight trends with BMI calculation. Track body composition (body fat %, muscle mass). View goal lines and progress over time.',
                    color: 'acid',
                  },
                  {
                    icon: BookOpen,
                    title: 'Daily Summaries & Streaks',
                    description: 'Get AI-generated summaries with insights. Review your nutrition, workouts, and water intake. Track logging streaks on dashboard.',
                    color: 'warning',
                  },
                ].map((feature, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <div className={`flex w-12 h-12 rounded-sm items-center justify-center mb-4 ${
                      feature.color === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                      feature.color === 'acid' ? 'bg-indigo-500/20 border border-indigo-500/30' :
                      'bg-amber-500/20 border border-amber-500/30'
                    }`}>
                      <feature.icon className={`h-6 w-6 ${
                        feature.color === 'success' ? 'text-emerald-500 stroke-emerald-500 dark:text-emerald-400 dark:stroke-emerald-400' :
                        feature.color === 'acid' ? 'text-indigo-500 stroke-indigo-500 dark:text-indigo-400 dark:stroke-indigo-400' :
                        'text-amber-500 stroke-amber-500 dark:text-amber-400 dark:stroke-amber-400'
                      } stroke-2 fill-none`} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-text mb-2 font-mono uppercase">{feature.title}</h3>
                    <p className="text-sm text-dim font-mono leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Recipe Management Guide */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <BookOpen className="h-8 w-8 text-amber-500 stroke-amber-500 dark:text-amber-400 dark:stroke-amber-400 stroke-2 fill-none" />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text font-sans">
                    Recipe Management
                  </h2>
                </div>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Create and manage recipes with simplified structure. Enter recipe name, servings, instructions, and nutrition. Save recipes as meal templates. Favorite recipes for quick access.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    title: 'Creating Recipes',
                    items: [
                      'Navigate to Recipes page',
                      "Click 'Create Recipe'",
                      'Enter recipe name, description, and servings',
                      'Add instructions in a single text field (step-by-step or paragraphs)',
                      'Enter nutrition per serving (calories, protein, carbs, fats)',
                      'Add prep time and cook time (optional)',
                      'Add tags (optional)',
                      'Save recipe',
                      'View recipe details in full-screen dialog',
                      'Save recipe as meal template for quick logging',
                    ],
                  },
                  {
                    title: 'Using Recipes',
                    items: [
                      'Open any recipe to view full details',
                      'View nutrition per serving',
                      'Save recipe as meal template for quick logging',
                      'Add recipe to meal plans',
                      'Favorite recipes for quick access',
                      'Edit or delete recipes anytime',
                    ],
                  },
                ].map((section, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <h3 className="text-2xl font-bold tracking-tight text-text mb-6 font-sans">{section.title}</h3>
                    <ul className="space-y-3">
                      {section.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500 dark:text-emerald-400 dark:fill-emerald-400 stroke-emerald-500 dark:stroke-emerald-400 stroke-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-dim font-mono leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Meal Planning Guide */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Calendar className="h-8 w-8 text-emerald-500 stroke-emerald-500 dark:text-emerald-400 dark:stroke-emerald-400 stroke-2 fill-none" />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text font-sans">
                    Meal Planning
                  </h2>
                </div>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Plan your weekly meals with our calendar view. Add recipes or custom meals. Generate smart grocery lists automatically.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    title: 'Planning Meals',
                    items: [
                      'Navigate to Meal Planning page',
                      'View weekly calendar (Monday-Sunday)',
                      'Click "+" button on any meal type',
                      'Choose "Choose Recipe" or "Custom Meal"',
                      'Select recipe from your collection or enter custom meal',
                      'Meal is added to your plan',
                      'Navigate between weeks with arrow buttons',
                      'Remove meals by clicking X button',
                    ],
                  },
                  {
                    title: 'Grocery Lists',
                    items: [
                      'Go to Grocery Lists page',
                      'Use search box to find and add items',
                      'Type item name and see autocomplete suggestions',
                      'Press Enter/Return to add item to list',
                      'Items auto-categorized (produce, meat, dairy, pantry, beverages, frozen, other)',
                      'Simple format: quantity and name (e.g., "2x Eggs")',
                      'Check off items as you shop',
                      'Delete items with trash icon',
                      'Optionally generate from meal plans',
                    ],
                  },
                ].map((section, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <h3 className="text-2xl font-bold tracking-tight text-text mb-6 font-sans">{section.title}</h3>
                    <ul className="space-y-3">
                      {section.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500 dark:text-emerald-400 dark:fill-emerald-400 stroke-emerald-500 dark:stroke-emerald-400 stroke-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-dim font-mono leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Achievements Guide */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Target className="h-8 w-8 text-orange-500 stroke-orange-500 dark:text-orange-400 dark:stroke-orange-400 stroke-2 fill-none" />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text font-sans">
                    Achievements
                  </h2>
                </div>
                <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto">
                  Unlock achievements for streaks, goals, and milestones. Track your progress and stay motivated.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: 'Streak Achievements',
                    items: ['7 days - On Fire', '30 days - Consistency Champion', '100 days - Century Streak'],
                    color: 'acid',
                  },
                  {
                    title: 'Goal Achievements',
                    items: ['Calorie goal 5 days - Goal Crusher', 'Protein goal 7 days - Protein Power'],
                    color: 'success',
                  },
                  {
                    title: 'Milestone Achievements',
                    items: ['First meal - First Bite', 'First workout - First Rep', '10 meals - Meal Master', '10 workouts - Workout Warrior', '30 days - Month Master'],
                    color: 'warning',
                  },
                  {
                    title: 'Special Achievements',
                    items: ['Perfect week - Logged meals and workouts every day for a week'],
                    color: 'accent',
                  },
                ].map((category, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <h3 className="text-xl font-bold tracking-tight text-text mb-4 font-mono uppercase">{category.title}</h3>
                    <ul className="space-y-2">
                      {category.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500 fill-emerald-500 dark:text-emerald-400 dark:fill-emerald-400 stroke-emerald-500 dark:stroke-emerald-400 stroke-2" />
                          <span className="text-xs text-dim font-mono leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Additional Features */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-7xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-4 font-sans">
                  Additional Features
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Droplet,
                    title: 'Water Tracking',
                    description: 'Set daily water goals and track your intake. Use quick-add buttons for common amounts (250ml, 500ml, 750ml, 1000ml).',
                    color: 'acid',
                  },
                  {
                    icon: BookMarked,
                    title: 'Meal Templates & Copy',
                    description: 'Save frequently eaten meals as templates. Log them with one click. Copy previous day meals instantly for meal prep days.',
                    color: 'success',
                  },
                  {
                    icon: Clock,
                    title: 'Smart Reminders',
                    description: 'Set up personalized reminders for meals, water, workouts, goals, weight logging, streaks, and daily summaries. Never miss tracking.',
                    color: 'accent',
                  },
                  {
                    icon: TrendingUp,
                    title: 'Advanced Analytics',
                    description: 'Correlation analysis (weight vs calories, protein vs workouts), predictions, and insights. Multiple time ranges with detailed charts.',
                    color: 'warning',
                  },
                  {
                    icon: Target,
                    title: 'Achievements',
                    description: 'Unlock achievements for streaks, goals, and milestones. Track progress and stay motivated with achievement badges.',
                    color: 'acid',
                  },
                  {
                    icon: ScanLine,
                    title: 'USDA Food Database',
                    description: 'Search 300,000+ foods from USDA FoodData Central API. Accurate nutrition data for quick meal logging.',
                    color: 'success',
                  },
                ].map((feature, i) => (
                  <div key={i} className="card-modern relative overflow-hidden group hover:border-acid/50 transition-all duration-300">
                    <div className={`flex w-12 h-12 rounded-sm items-center justify-center mb-4 ${
                      feature.color === 'acid' ? 'bg-indigo-500/20 border border-indigo-500/30' :
                      feature.color === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                      feature.color === 'accent' ? 'bg-orange-500/20 border border-orange-500/30' :
                      'bg-amber-500/20 border border-amber-500/30'
                    }`}>
                      <feature.icon className={`h-6 w-6 ${
                        feature.color === 'acid' ? 'text-indigo-500 stroke-indigo-500 dark:text-indigo-400 dark:stroke-indigo-400' :
                        feature.color === 'success' ? 'text-emerald-500 stroke-emerald-500 dark:text-emerald-400 dark:stroke-emerald-400' :
                        feature.color === 'accent' ? 'text-orange-500 stroke-orange-500 dark:text-orange-400 dark:stroke-orange-400' :
                        'text-amber-500 stroke-amber-500 dark:text-amber-400 dark:stroke-amber-400'
                      } stroke-2 fill-none`} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-text mb-2 font-mono uppercase">{feature.title}</h3>
                    <p className="text-sm text-dim font-mono leading-relaxed">{feature.description}</p>
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
