import { Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  HelpCircle,
  Search,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I create an account?',
          a: "Click the 'Get Started' button on the landing page, then choose to sign up with email. You'll receive a confirmation email to verify your account.",
        },
        {
          q: 'Can I use NutriScope without creating an account?',
          a: "Yes! You can use NutriScope in guest mode with anonymous authentication. All features work, and your data is saved in Supabase. When you're ready, you can convert to a full account and your data will be migrated automatically.",
        },
        {
          q: 'How do I set up my profile?',
          a: "After creating your account, you'll be guided through a 3-step onboarding process: Step 1 (Basic Info) - Enter your name, age, weight, and height. Step 2 (Goals) - Select your fitness goal (lose weight, gain muscle, maintain, improve fitness), dietary preference, and activity level. Step 3 (Targets) - Review personalized calorie, protein, and water targets calculated based on your profile, with explanations. You can edit these targets before completing setup.",
        },
        {
          q: 'What is the password strength meter?',
          a: 'The password strength meter helps you create a secure password. It shows real-time strength assessment (Weak/Fair/Good/Strong), displays a visual strength bar, and checks criteria like 8+ characters, uppercase/lowercase letters, numbers, and special characters. It also provides security tips and prevents signup with weak passwords.',
        },
      ],
    },
    {
      category: 'Meal Logging',
      questions: [
        {
          q: 'How accurate is the AI meal parsing?',
          a: "Our AI is trained on extensive nutrition databases and can accurately parse most common foods. For best results, be specific (e.g., 'grilled chicken breast' instead of 'chicken'). You can also use the USDA Food Database to search 300,000+ foods with official nutrition data.",
        },
        {
          q: 'Can I edit meals after logging them?',
          a: "Yes! Click the Edit button on any meal card to modify calories, protein, carbs, fats, meal type, or notes. No need to delete and recreate entries.",
        },
        {
          q: "What if the AI doesn't recognize my food?",
          a: 'You can manually enter nutrition information, search the USDA Food Database (300,000+ foods), take a photo for AI analysis, use voice input, or save meals as templates for quick logging later.',
        },
        {
          q: 'How do meal templates work?',
          a: 'After logging a meal, click "Save Template" to save it. You can also copy all meals from yesterday with one click. Templates appear in the Templates panel for quick access.',
        },
        {
          q: 'How does the USDA Food Database search work?',
          a: 'Click "Search Food Database" in the meal form, type a food name (e.g., "chicken breast"), and browse results from the official USDA database. Select a food to auto-fill accurate nutrition data.',
        },
      ],
    },
    {
      category: 'Workouts',
      questions: [
        {
          q: 'How do I log a workout?',
          a: "Go to the Workouts tab and click 'Log Workout'. You can browse the exercise library (150+ exercises) to select an exercise, which auto-fills the form and calculates calories using METs. Or manually enter exercise details. You can edit or delete workouts anytime.",
        },
        {
          q: 'How does the exercise library work?',
          a: 'Click "Browse" in the workout form to open the exercise library. Search by name or filter by type (cardio, strength, yoga, sports, other). Select an exercise to auto-fill the form. Calories are calculated automatically using METs formula based on your weight and duration.',
        },
        {
          q: 'How are calories burned calculated?',
          a: "When using the exercise library, calories are calculated using the METs formula: Calories = METs × weight (kg) × duration (hours). METs values are from a comprehensive exercise database. For manual entries, you enter calories directly.",
        },
      ],
    },
    {
      category: 'AI Chat',
      questions: [
        {
          q: 'What can I ask the AI chat assistant?',
          a: "You can ask questions about your nutrition data, get meal suggestions, ask about macros, request advice based on your goals, and more. The AI uses your profile data (name, age, weight, height, activity level, dietary preferences, and daily progress) to provide highly personalized responses. The AI can also log meals/workouts/water automatically when you ask. Use voice input or upload images for analysis.",
        },
        {
          q: 'Is my data private?',
          a: 'Yes! Your data is encrypted and stored securely. The AI only accesses your data to provide personalized responses, and we never share it with third parties.',
        },
        {
          q: 'Can the AI help me plan meals?',
          a: 'Yes! Ask the AI for meal suggestions based on your goals, dietary preferences, and past meals. It can provide recipes and nutrition information. The AI considers your personalized calorie and protein targets when making suggestions.',
        },
        {
          q: 'How personalized are AI responses?',
          a: 'The AI uses comprehensive user profile data including your name, age, weight, height, activity level, dietary preferences, restrictions, and daily progress to provide highly personalized advice. It references your specific targets and adapts suggestions to your current intake and goals.',
        },
      ],
    },
    {
      category: 'Troubleshooting',
      questions: [
        {
          q: "I can't log in to my account",
          a: "Make sure you've verified your email address. Check your spam folder for the confirmation email. If you still can't log in, try resetting your password.",
        },
        {
          q: "My data isn't syncing",
          a: 'Check your internet connection. Data syncs automatically when online. If issues persist, try refreshing the page or logging out and back in.',
        },
        {
          q: "How do I track my weight?",
          a: "Go to Profile page and use the Weight Tracking section. Log daily weight with optional body fat % and muscle mass. View trends chart with BMI calculation. You can also use Quick Weight Entry on the Dashboard. Set up weight logging reminders to maintain consistent tracking.",
        },
        {
          q: "Voice input isn't working",
          a: 'Check that your browser has microphone permissions enabled. Voice input works best in quiet environments with clear speech.',
        },
        {
          q: "Charts aren't showing data",
          a: "Make sure you've logged meals or workouts. Charts need at least a few days of data to display properly. Use the time range selector (7d, 30d, 3m, 1y, custom) to view different periods. Try logging data for multiple days.",
        },
        {
          q: "The app seems slow",
          a: "We've implemented code splitting and performance monitoring to optimize load times. If you experience slowness, check your internet connection. Performance metrics are tracked automatically to help us improve.",
        },
      ],
    },
    {
      category: 'Recipes & Meal Planning',
      questions: [
        {
          q: 'How do I create a recipe?',
          a: 'Go to the Recipes page, click "Create Recipe", enter recipe name, description, servings, add instructions in a single text field (step-by-step or paragraphs), enter nutrition per serving (calories, protein, carbs, fats), add prep time and cook time (optional), and save. You can also save recipes as meal templates for quick logging.',
        },
        {
          q: 'How do I use recipes?',
          a: 'Create recipes with name, servings, instructions, and nutrition. View recipe details in full-screen dialog. Save recipes as meal templates for quick logging. Add recipes to meal plans. Favorite recipes for quick access. Edit or delete recipes anytime.',
        },
        {
          q: 'How does meal planning work?',
          a: 'Go to Meal Planning page, view the weekly calendar (Monday-Sunday), click "+" on any meal type, choose a recipe from your collection or add a custom meal. Plan meals for the entire week.',
        },
        {
          q: 'How do I use the grocery list?',
          a: 'Go to Grocery Lists page and use the search box to find and add items. Type an item name to see autocomplete suggestions from the database. Press Enter/Return to add items. Items are auto-categorized (produce, meat, dairy, pantry, beverages, frozen, other) and displayed in a simple format (quantity and name, e.g., "2x Eggs"). Check off items as you shop. You can also optionally generate lists from meal plans.',
        },
      ],
    },
    {
      category: 'Achievements & Analytics',
      questions: [
        {
          q: 'What achievements can I unlock?',
          a: 'Streak achievements (7, 30, 100 days), goal achievements (calorie/protein goals), milestone achievements (first meal, first workout, 10 meals, 10 workouts, 30 days), and special achievements (perfect week).',
        },
        {
          q: 'How do I view my achievements?',
          a: 'Go to the Achievements page to see all available achievements, your progress, and unlocked badges. Achievement widget also appears on Dashboard and Profile.',
        },
        {
          q: 'What are correlation analysis and predictions?',
          a: 'Advanced analytics show correlations between weight and calories, protein and workouts. Predictions forecast weight trends and days to goal. Available in Analytics page.',
        },
        {
          q: 'What time ranges are available in analytics?',
          a: 'You can view analytics for 7 days, 30 days, 3 months, 1 year, or a custom date range. Charts update automatically based on your selection.',
        },
      ],
    },
    {
      category: 'Account & Settings',
      questions: [
        {
          q: 'How do I change my goals?',
          a: "Go to your Profile page, click Edit, then update your calorie, protein, and water goals. You can also set weight goals and configure reminder settings (meals, water, workouts, goals, weight logging, streaks, and daily summaries). Changes apply immediately.",
        },
        {
          q: 'What is streak tracking?',
          a: "Streak tracking counts consecutive days you've logged meals, workouts, or water. Your current streak is displayed on the Dashboard. Keep logging daily to maintain your streak!",
        },
        {
          q: 'How does guest mode work?',
          a: 'Guest mode lets you use NutriScope without creating an account. All features work, and your data is saved. When you sign up, all your data (meals, workouts, recipes, meal plans, grocery lists, achievements, weight logs, chat history) migrates automatically.',
        },
        {
          q: 'How do I delete my account?',
          a: "Contact us at nutriscopeteam@gmail.com to request account deletion. We'll process your request and permanently delete all your data within 30 days.",
        },
        {
          q: 'Can I change my email address?',
          a: "Yes, you can update your email address in your profile settings. You'll need to verify the new email address.",
        },
      ],
    },
  ]

  const filteredFaqs = faqs
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (item) =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.questions.length > 0)

  const toggleFaq = (categoryIndex: number, faqIndex: number) => {
    const globalIndex = categoryIndex * 100 + faqIndex
    setOpenFaq(openFaq === globalIndex ? null : globalIndex)
  }

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
                Help Center
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text mt-6 font-sans leading-[0.95]">
                How can we help you?
              </h1>

              <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto mt-6 leading-relaxed">
                Find answers to common questions and troubleshooting tips. Can't find what you're looking for? Check our Documentation or Guides.
              </p>

              {/* Search Bar */}
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dim" />
                  <input
                    type="text"
                    placeholder="Search for help..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-surface/50 backdrop-blur-md border border-border text-text placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-acid/30 font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Sections */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-4xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              {filteredFaqs.map((category, categoryIndex) => (
                <div key={categoryIndex} className="mb-12">
                  <h2 className="text-2xl font-bold tracking-tight text-text mb-6 font-sans">
                    {category.category}
                  </h2>
                  <div className="space-y-4">
                    {category.questions.map((faq, faqIndex) => {
                      const globalIndex = categoryIndex * 100 + faqIndex
                      const isOpen = openFaq === globalIndex
                      return (
                        <div
                          key={faqIndex}
                          className="card-modern relative overflow-hidden"
                        >
                          <button
                            onClick={() => toggleFaq(categoryIndex, faqIndex)}
                            className="w-full p-6 text-left flex items-center justify-between hover:bg-panel/50 transition"
                          >
                            <span className="text-base font-mono text-text pr-8">
                              {faq.q}
                            </span>
                            {isOpen ? (
                              <ChevronUp className="h-5 w-5 text-dim flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-dim flex-shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-6">
                              <p className="text-sm text-dim font-mono leading-relaxed">
                                {faq.a}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Section */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-4xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-4 font-sans">
                  Still have questions?
                </h2>
                <p className="text-base sm:text-lg text-dim font-mono mb-6 max-w-2xl mx-auto">
                  Can't find what you're looking for? Reach out to our support team.
                </p>
                <a
                  href="mailto:nutriscopeteam@gmail.com"
                  className="inline-flex items-center gap-2 text-acid hover:opacity-80 transition font-mono font-bold text-lg"
                >
                  nutriscopeteam@gmail.com
                </a>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  )
}
