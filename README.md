# NutriScope - AI-Powered Health & Fitness Tracker

A comprehensive, modern health and fitness tracking application that simplifies nutrition and workout logging through natural conversation, intelligent meal planning, recipe management, and advanced analytics.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://nutriscope.app)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.2-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-2.38.4-3ecf8e)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Why NutriScope?

- **AI-Powered Logging** - Log meals and workouts through natural conversation
- **Comprehensive Tracking** - Calories, macros, workouts, weight, water, and more
- **Smart Analytics** - Advanced insights with correlations, predictions, and goal tracking
- **Meal Planning** - Weekly meal planning with recipe integration and grocery list generation
- **Guest Mode** - Try the full app without signup, migrate data when ready

## ✨ Core Features

- **🍽️ Meal Logging** - Manual entry, USDA FoodData Central search (300K+ foods), AI chat, image recognition
- **💪 Workout Tracking** - 150+ exercises with METs-based calorie calculation
- **📊 Advanced Analytics** - Goal achievement rates, weekly patterns, weight trends with BMI, correlation insights
- **📅 History** - Calendar view of past activity with weekly overview
- **📋 Daily Summary** - AI-generated daily summaries with insights, goal tracking, and tips
- **💬 AI Chat Assistant** - Voice input (Whisper transcription), image upload, natural language logging, personalized coaching
- **🔔 Smart Reminders** - Meal, water, workout, weight, streak, and daily summary reminders
- **📝 Recipe Management** - Create, save, and plan meals with nutrition tracking
- **📅 Meal Planning** - Weekly calendar view with grocery list generation
- **🛒 Grocery Lists** - Smart search, auto-categorization, meal plan integration
- **🏆 Achievements** - Streak, goal, milestone, and special achievements
- **📱 PWA** - Installable, offline support, mobile-optimized
- **🎯 Personalized Targets** - BMR/TDEE calculations based on profile (age, weight, height, activity level, goals)
- **📈 Streak Tracking** - Daily logging streaks with visual indicators
- **🌓 Theme Support** - Dark, light, and system theme modes
- **📋 Onboarding** - 3-step guided setup (Basic Info → Goals → Personalized Targets)
- **💧 Water Tracking** - Daily water intake logging with quick-add buttons
- **⚖️ Weight Tracking** - BMI calculation, weight trends, and body composition tracking
- **📊 Daily Summary** - AI-generated daily summaries with insights and tips
- **🔄 Real-time Updates** - Live data synchronization across devices
- **♿ Accessibility** - ARIA labels, keyboard navigation, skip links

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript 5.3** + **Vite 5**
- **TanStack React Query 5** - Data fetching and caching
- **Tailwind CSS 3** - Utility-first styling
- **Radix UI** - Accessible components
- **Recharts 2** + **D3.js 7** - Data visualization and advanced charts

### Backend
- **Supabase** - PostgreSQL database, authentication, storage, real-time
- **Row Level Security (RLS)** - Data isolation and security

### AI Services
- **OpenAI API** - GPT-4o-mini (chat), Whisper (voice transcription), Vision (images)

### External APIs
- **USDA FoodData Central API** - Food database search

### Additional Features
- **Code Splitting** - React.lazy for optimized bundle sizes
- **Performance Monitoring** - Built-in performance tracking and analytics
- **Error Tracking** - Sentry integration for production error monitoring
- **Analytics** - Google Analytics integration for usage insights
- **Real-time Subscriptions** - Supabase real-time for live data updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/pnpm
- Supabase account (for production)
- OpenAI API key (for AI features)
- USDA API key (optional, for food search)

### Local Development

1. **Clone and install:**
```bash
git clone <repository-url>
cd nutriscope-web
pnpm install
```

2. **Set up environment variables:**

Create `.env` file:
```env
# Supabase (required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (required for AI features)
VITE_OPENAI_API_KEY=your_openai_api_key

# USDA Food Database (optional)
VITE_USDA_API_KEY=your_usda_api_key

# App Configuration
VITE_APP_ENV=development
VITE_API_URL=/api/chat
VITE_USE_BACKEND_PROXY=true

# Optional: Monitoring
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Google Analytics
VITE_SENTRY_DSN=your_sentry_dsn        # Error tracking
```

⚠️ **Security Note:** Never ship `VITE_OPENAI_API_KEY` to production clients. Use the serverless proxy (`/api/chat`, `/api/transcribe`) on Vercel to keep API keys server-side.

3. **Run development server:**
```bash
pnpm dev
```

App runs at `http://localhost:5173`

**Production:** https://nutriscope.app

## 🗄️ Supabase Setup

### Database Schema

Run these SQL files in Supabase Dashboard → SQL Editor (in order):

1. `supabase_schema.sql` - Main database schema
2. `exercise_library_schema.sql` - Exercise library table
3. `exercise_library_data.sql` - Exercise data (150+ exercises)
4. `weight_tracking_schema.sql` - Weight tracking tables
5. `achievements_recipes_schema.sql` - Recipes, meal plans, grocery lists, achievements
6. `rls_policies_verification.sql` - Enable RLS and create security policies

### Enable Features

- **Anonymous Authentication** - Enable in Supabase Dashboard → Authentication
- **Storage Buckets** - Create `chat-images` bucket (and optionally `recipe-images`)

### Guest Mode

**Guest Mode (No Signup):** Guest users can use the full app without creating an account, backed by Supabase Anonymous Auth. Supabase must still be configured for guest mode to work. All guest data can be migrated when converting to an account.

### Onboarding Flow

New users go through a 3-step onboarding process:

1. **Basic Info** - Name, age, weight, height (optional except name)
2. **Goals** - Select fitness goal (lose weight, gain muscle, maintain, improve fitness), dietary preference, and activity level
3. **Personalized Targets** - Review and edit calculated calorie, protein, and water targets based on BMR/TDEE calculations

The onboarding dialog appears automatically for new users and can be reset via the database `onboarding_completed` flag.

## 📁 Project Structure

```
nutriscope-web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Radix UI primitives
│   │   └── ...              # Feature components
│   ├── pages/               # Page components
│   ├── services/            # API service functions
│   ├── contexts/            # React contexts (Auth)
│   ├── lib/                 # Third-party configs
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── api/                     # Vercel serverless functions
│   ├── chat.ts              # OpenAI API proxy (GPT-4o-mini)
│   └── transcribe.ts        # Whisper API proxy (voice transcription)
├── public/                  # Static assets & PWA files
├── supabase_schema.sql      # Main database schema
└── migrations/              # Database migration files
```

## 🔐 Security

### Database Security
- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data (`auth.uid() = user_id`)
- Anonymous users have isolated data
- Exercise library is publicly readable (reference data)

### API Security
- **Backend Proxy** - Use `/api/chat` and `/api/transcribe` serverless functions for OpenAI API calls
- **Environment Variables** - Never expose API keys in client code
- **Rate Limiting** - Implemented in backend proxy (optional)

### Authentication
- Email/Password authentication
- Anonymous authentication (guest mode)
- Secure session management via Supabase

### Data Privacy
- Complete data isolation per user
- Secure image uploads with RLS policies
- GDPR-compliant data handling

## 🚢 Deployment

### Vercel (Recommended)

1. **Push to Git repository**

2. **Import in Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "New Project" → Import repository

3. **Configure environment variables:**
   ```env
   VITE_SUPABASE_URL=your_production_supabase_url
   VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   VITE_USDA_API_KEY=your_usda_api_key
   VITE_APP_ENV=production
   VITE_API_URL=/api/chat
   VITE_USE_BACKEND_PROXY=true
   ```

4. **Deploy**

The `/api/chat.ts` and `/api/transcribe.ts` serverless functions automatically handle OpenAI API calls securely.

## 📝 API Keys Setup

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create account → API Keys section
3. Create new API key
4. Add to `.env` as `VITE_OPENAI_API_KEY`

### USDA FoodData Central API Key (Optional)
1. Sign up at [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-sign-up.html)
2. Get free API key
3. Add to `.env` as `VITE_USDA_API_KEY`

### Supabase Setup
1. Create account at [Supabase](https://supabase.com)
2. Create new project
3. Get project URL and anon key from Settings → API
4. Add to `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 🐛 Troubleshooting

**Guest mode not working:**
- Ensure Anonymous Authentication is enabled in Supabase Dashboard
- Check Supabase URL and anon key in `.env`

**Food search not working:**
- Add `VITE_USDA_API_KEY` to `.env`
- Get free API key from [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-sign-up.html)

**AI chat not responding:**
- Verify `VITE_OPENAI_API_KEY` is set
- Check API key is valid and has credits
- Use backend proxy (`/api/chat`, `/api/transcribe`) in production

**Voice transcription not working:**
- Verify `/api/transcribe.ts` is deployed on Vercel
- Check browser microphone permissions
- Ensure `VITE_OPENAI_API_KEY` has access to Whisper API

**RLS policy errors:**
- Run `rls_policies_verification.sql` in Supabase SQL Editor
- Verify all tables have RLS enabled

## 🎯 Roadmap

### Completed (v1.0)
- ✅ Core meal and workout logging
- ✅ AI chat with voice transcription and image support
- ✅ Advanced analytics with correlations and predictions
- ✅ Weight tracking with BMI calculation
- ✅ Meal planning and grocery lists
- ✅ Recipe management
- ✅ Achievements system with streak tracking
- ✅ Guest mode with complete data migration
- ✅ PWA features (installable, offline support)
- ✅ 3-step onboarding with personalized targets
- ✅ Water intake tracking
- ✅ Daily AI summaries and insights
- ✅ Theme switching (dark/light/system)
- ✅ Real-time data synchronization
- ✅ Code splitting for performance
- ✅ Error boundary and error tracking
- ✅ Performance monitoring
- ✅ Accessibility features (ARIA, keyboard navigation)

### Future Enhancements
- [ ] Barcode scanner for meal logging
- [ ] Integration with wearables (Fitbit, Apple Health, Google Fit)
- [ ] Export data (CSV, PDF)
- [ ] Advanced AI coaching features
- [ ] Social features and sharing
- [ ] Community challenges

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

- **Email:** nutriscopeteam@gmail.com
- **Documentation:** `/documentation` in-app
- **Help Center:** `/help` in-app
- **Issues:** Open an issue on GitHub

## 🙏 Acknowledgments

- **OpenAI** - For GPT-4o-mini, Whisper, and Vision APIs
- **Supabase** - For backend infrastructure (PostgreSQL, Auth, Storage, Real-time)
- **USDA** - For FoodData Central API
- **Radix UI** - For accessible components
- **Recharts & D3.js** - For beautiful charts and data visualization
- **TanStack React Query** - For powerful data fetching and caching
- **Vercel** - For deployment platform and serverless functions

---

**Built with ❤️ using React, TypeScript, Supabase, and OpenAI**

*NutriScope - Your AI-powered health and fitness companion*
