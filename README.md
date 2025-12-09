# NutriScope - AI-Powered Health & Fitness Tracker

A comprehensive, modern health and fitness tracking application that simplifies nutrition and workout logging through natural conversation, intelligent meal planning, recipe management, and advanced analytics. Built with React, TypeScript, Supabase, and OpenAI.

![NutriScope](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.2-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-2.38.4-3ecf8e)
![Vite](https://img.shields.io/badge/Vite-5.0.5-646CFF)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Overview

NutriScope is a full-featured health and fitness tracking platform that combines AI-powered assistance with comprehensive data tracking, meal planning, recipe management, and advanced analytics. Whether you're tracking meals, planning workouts, managing recipes, or analyzing your progress, NutriScope provides an intuitive, modern interface powered by cutting-edge AI.

## ✨ Key Features

### 🍽️ **Meal Logging & Nutrition**
- **Multiple Input Methods:**
  - Manual entry with full nutrition details (calories, protein, carbs, fats)
  - **USDA Food Database Search** - Search 300,000+ foods with accurate nutrition data
  - AI-powered natural language logging via chat
  - Image recognition for meal logging
  - Meal templates for quick logging
  - Copy previous day's meals with one click

- **Meal Types:** Pre Breakfast, Breakfast, Morning Snack, Lunch, Evening Snack, Dinner, Post Dinner
- **Nutrition Tracking:** Calories, protein, carbs, fats (carbs and fats optional)
- **Edit & Delete:** Full CRUD operations for meal management
- **Food Database:** Integration with USDA FoodData Central API for accurate nutrition data

### 💪 **Workout Tracking**
- **Exercise Library:** Browse 150+ exercises with METs values for accurate calorie calculation
- **Automatic Calorie Calculation:** METs-based formula using user weight and duration
- **Exercise Types:** Cardio, Strength, Yoga, Sports, Other
- **Multiple Exercises:** Log multiple exercises per workout session
- **Detailed Tracking:** Duration, sets, reps, weight, calories burned
- **AI Logging:** Natural language workout logging via chat
- **Edit & Delete:** Full workout management capabilities

### 📊 **Dashboard & Daily Overview**
- **Real-time Progress:**
  - Daily calorie balance (consumed/burned/net)
  - Protein intake tracking
  - Water intake progress with goal tracking
  - Quick weight entry widget
  - Streak counter (consecutive logging days)
  - Achievement widget

- **Quick Actions:**
  - Add meal/workout shortcuts
  - Quick water intake buttons
  - Weight entry from dashboard
  - Navigate to detailed pages

- **Summary Cards:**
  - Calorie balance breakdown
  - Macro distribution
  - Activity summary

### 📈 **Advanced Analytics**
- **Multiple Time Ranges:**
  - 7 days, 30 days, 3 months, 1 year
  - Custom date range picker

- **Comprehensive Charts:**
  - Calorie balance trends (bar charts)
  - Protein intake trends (line charts)
  - Macronutrients breakdown (area charts)
  - Weight trends with BMI tracking
  - Water intake statistics
  - Workout frequency and calories burned

- **Advanced Analytics:**
  - **Correlation Analysis:**
    - Weight vs Calories correlation
    - Protein vs Workouts correlation
    - Scatter charts with correlation coefficients
    - AI-generated insights

  - **Predictions:**
    - Weight prediction based on trends
    - Days to goal calculation
    - Trend analysis (increasing/decreasing/stable)

- **Summary Statistics:**
  - Average calories consumed/burned
  - Total workouts and calories burned
  - Average protein intake
  - Water intake averages

### 🏆 **Achievements System**
- **Achievement Types:**
  - **Streak Achievements:** 7 days, 30 days, 100 days
  - **Goal Achievements:** Calorie goal (5 days), Protein goal (7 days)
  - **Milestone Achievements:** First meal, First workout, 10 meals, 10 workouts, 30 days logged
  - **Special Achievements:** Perfect week (meals + workouts every day)

- **Features:**
  - Progress tracking for each achievement
  - Achievement badges with icons
  - Achievement widget on dashboard
  - Dedicated achievements page
  - Unlock notifications

### 📝 **Recipe Management**
- **Create & Manage Recipes:**
  - Recipe name, description, servings
  - Ingredient list with quantities and units
  - Step-by-step instructions
  - Prep time and cook time
  - Nutrition per serving (auto-calculated or manual)
  - Recipe images
  - Tags and categories
  - Favorite recipes

- **Recipe Features:**
  - **Recipe Scaling:** Scale ingredients and nutrition for different serving sizes
  - **Nutrition Calculation:** Automatic nutrition calculation from ingredients
  - **Recipe Browser:** Browse all your recipes
  - **Quick Add:** Add recipes directly to meal plans
  - **Edit & Delete:** Full recipe management

### 📅 **Meal Planning**
- **Weekly Calendar View:**
  - Plan meals for entire week (Monday-Sunday)
  - Multiple meal types per day
  - Week navigation (previous/next week)
  - Visual meal planning interface

- **Planning Options:**
  - Add recipes from your recipe collection
  - Add custom meals with nutrition data
  - Remove planned meals
  - View planned meals by day and meal type

- **Integration:**
  - Generate grocery lists from meal plans
  - Link recipes to planned meals
  - Track planned vs actual meals

### 🛒 **Grocery Lists**
- **Smart List Generation:**
  - Auto-generate from meal plans
  - Aggregate ingredients across all planned meals
  - Automatic categorization (produce, meat, dairy, pantry, other)
  - Quantity aggregation and unit conversion

- **List Management:**
  - Create custom grocery lists
  - Add/remove items manually
  - Check off items as you shop
  - Edit quantities and units
  - Multiple lists support

### 💬 **AI Chat Assistant**
- **Natural Language Interface:**
  - Conversational meal/workout logging
  - Nutrition and fitness questions
  - Personalized insights and recommendations
  - Context-aware responses

- **Multi-Modal Input:**
  - **Voice Input:** Record audio and transcribe with OpenAI Whisper
  - **Image Upload:** Upload meal photos for AI analysis (OpenAI Vision)
  - **Text Chat:** Traditional text-based conversation

- **Advanced Features:**
  - **Action Execution:** AI automatically logs meals/workouts/water based on conversation
  - **Conversation Persistence:** Save chat history to database
  - **Chat History:** View and resume previous conversations
  - **Enhanced Context:** AI has access to daily log, profile, and goals
  - **Typing Animations:** Smooth message animations
  - **Streaming Responses:** Real-time AI response streaming

### ⚖️ **Weight Tracking**
- **Daily Weight Logging:**
  - Quick entry from dashboard
  - Body composition tracking (body fat %, muscle mass)
  - Notes and observations
  - Historical weight data

- **BMI Calculation:**
  - Automatic BMI calculation from weight and height
  - BMI category (underweight, normal, overweight, obese)
  - Visual BMI indicators

- **Weight Trends:**
  - Weight trend charts with goal lines
  - Weight change tracking
  - Average, min, max statistics
  - Integration with analytics page

### 💧 **Water Intake Tracking**
- **Daily Hydration:**
  - Cumulative water tracking
  - Quick-add buttons (250ml, 500ml, 750ml, 1000ml)
  - Custom amount entry
  - Daily goal tracking (default 2000ml)
  - Progress visualization

- **Integration:**
  - Water intake included in daily summaries
  - Analytics tracking
  - Goal reminders

### 🔥 **Streak Tracking**
- **Logging Streaks:**
  - Current streak counter
  - Longest streak record
  - Streak widget on dashboard
  - Visual streak indicators
  - Streak achievements

### 📅 **History & Summaries**
- **Calendar View:**
  - Visual activity indicators (meals, workouts, water)
  - Week navigation
  - Date selection
  - Quick access to daily summaries

- **Daily Summary Page:**
  - Comprehensive daily breakdown
  - **AI-Generated Insights:** Personalized recommendations and observations
  - Key metrics grid
  - Nutrition breakdown
  - Calorie balance visualization
  - Meal and workout lists
  - Cached insights (prevents unnecessary API calls)

### 👤 **User Management**
- **Guest Mode:**
  - Try the app without creating an account
  - Anonymous authentication via Supabase
  - Full functionality without signup
  - **Complete Data Migration:** All data migrates when converting to account:
    - User profiles
    - Meals and workouts
    - Daily logs
    - Weight logs
    - Recipes
    - Meal plans
    - Grocery lists
    - Achievements
    - Chat conversations
    - Meal templates

- **Onboarding:**
  - Multi-step profile setup
  - Goal selection (lose weight, gain muscle, maintain, improve fitness)
  - Activity level configuration
  - Dietary preferences
  - Calorie and protein targets
  - Water goal setting
  - Height, age, weight collection

- **Profile Management:**
  - Edit personal information
  - Update goals and targets
  - Configure reminder settings
  - View achievements
  - Account settings

### 🔔 **Notifications & Reminders**
- **Browser Notifications:**
  - Meal reminders (breakfast, lunch, dinner, snacks)
  - Water intake reminders (configurable intervals)
  - Workout reminders (scheduled days and times)
  - Goal progress reminders
  - Customizable schedules

- **Permission Management:**
  - Notification permission dialog after onboarding
  - Enable/disable in profile settings
  - Per-reminder type configuration

### 📱 **Progressive Web App (PWA)**
- **Installable:**
  - Add to home screen
  - App shortcuts
  - Install prompt
  - Offline support (service worker)

- **Mobile Optimized:**
  - Full-screen mobile experience
  - Touch-friendly interfaces
  - Mobile-first responsive design
  - Optimized navigation (bottom nav on mobile, header on desktop)
  - Pull-to-refresh functionality

### 🎨 **Modern UI/UX**
- **Design System:**
  - Dark theme with acid green accents
  - Consistent typography (Inter, Space Grotesk, JetBrains Mono)
  - Card-based layouts
  - Smooth animations and transitions
  - Loading skeletons (replaces spinners)
  - Improved empty states with helpful messages

- **Responsive Design:**
  - Mobile-first approach
  - Desktop and tablet optimized
  - Touch-friendly targets
  - Adaptive layouts

- **Accessibility:**
  - Radix UI components (accessible primitives)
  - Keyboard navigation
  - Screen reader support
  - Focus management

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript 5.3** - Type-safe development
- **Vite 5** - Fast build tool and dev server
- **React Router DOM 6** - Client-side routing
- **TanStack React Query 5** - Powerful data fetching and caching
  - Query persistence to localStorage
  - Optimistic updates
  - Automatic refetching
- **Tailwind CSS 3** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
  - Dialog, Select, Progress, Tabs, Toast, Dropdown Menu
- **Recharts 2** - Chart library (Bar, Line, Area, Scatter charts)
- **D3.js 7** - Data visualization utilities
- **date-fns 2** - Date manipulation and formatting
- **lucide-react** - Modern icon library
- **react-hook-form 7** - Form handling with validation
- **zod 3** - Schema validation

### Backend
- **Supabase** - Backend-as-a-Service
  - **PostgreSQL Database** - Relational database
  - **Row Level Security (RLS)** - Data security policies
  - **Authentication:**
    - Email/Password authentication
    - Anonymous authentication (guest mode)
  - **Storage** - Image uploads (chat images, recipe images)
  - **Real-time Subscriptions** - Live data updates

### AI Services
- **OpenAI API**
  - **GPT-4o-mini** - Conversational AI (primary)
  - **GPT-4o** - Enhanced AI features
  - **Whisper** - Voice transcription
  - **Vision** - Image analysis and meal recognition

### External APIs
- **USDA FoodData Central API** - Food database search (300,000+ foods)
  - Requires API key (free): https://fdc.nal.usda.gov/api-key-sign-up.html

## 📋 Prerequisites

- **Node.js** 18+ and npm/pnpm
- **Supabase** account and project (for production)
- **OpenAI API** key (for AI features)
- **USDA API** key (optional, for food database search)

## 🚀 Getting Started

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd nutriscope-web
```

2. **Install dependencies:**
```bash
npm install
# or
pnpm install
```

3. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API (for AI features)
VITE_OPENAI_API_KEY=your_openai_api_key

# USDA Food Database API (optional, for food search)
VITE_USDA_API_KEY=your_usda_api_key

# App Environment
VITE_APP_ENV=development

# Backend API Proxy (optional, for production)
VITE_API_URL=/api/chat
VITE_USE_BACKEND_PROXY=true
```

**Note:** The app can run in **Guest Mode** without Supabase configured. Guest mode uses Supabase Anonymous Authentication. To enable cloud sync and user accounts, configure Supabase credentials.

### Database Setup

1. **Run the SQL schema:**

Open Supabase Dashboard → SQL Editor and run the following files in order:

- `supabase_schema.sql` - Main database schema
- `exercise_library_schema.sql` - Exercise library table
- `exercise_library_data.sql` - Exercise data (150+ exercises)
- `weight_tracking_schema.sql` - Weight tracking tables
- `achievements_recipes_schema.sql` - Recipes, meal plans, grocery lists, achievements

2. **Enable Row Level Security:**

Run `rls_policies_verification.sql` to:
- Enable RLS on all tables
- Create security policies
- Verify policy configuration

3. **Enable Supabase features:**
   - Enable Anonymous Authentication in Supabase Dashboard
   - Configure Storage bucket for chat images (`chat-images`)
   - Set up Storage bucket for recipe images (optional)

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Generate PWA icons
npm run generate-icons
```

The app will be available at `http://localhost:5173` (development)

**Production:** https://nutriscope.app

## 📁 Project Structure

```
nutriscope-web/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # Radix UI components
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── ...
│   │   ├── AchievementBadge.tsx
│   │   ├── AchievementWidget.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ExerciseSelector.tsx
│   │   ├── FoodSearch.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── Layout.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── Logo.tsx
│   │   ├── NotificationPermissionDialog.tsx
│   │   ├── OnboardingDialog.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── PullToRefresh.tsx
│   │   ├── QuickWeightEntry.tsx
│   │   ├── ReminderScheduler.tsx
│   │   ├── ReminderSettings.tsx
│   │   ├── ScrollToTop.tsx
│   │   ├── StreakWidget.tsx
│   │   └── WeightChart.tsx
│   ├── contexts/                # React contexts
│   │   └── AuthContext.tsx      # Authentication and user state
│   ├── lib/                     # Third-party library configs
│   │   ├── supabase.ts          # Supabase client
│   │   ├── openai.ts            # OpenAI client
│   │   ├── errors.ts            # Error handling utilities
│   │   └── sentry.ts            # Error tracking (optional)
│   ├── pages/                   # Page components
│   │   ├── AboutPage.tsx
│   │   ├── AchievementsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── AuthPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── CookiePolicyPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DocumentationPage.tsx
│   │   ├── GroceryListPage.tsx
│   │   ├── HelpPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── MealPlanningPage.tsx
│   │   ├── MealsPage.tsx
│   │   ├── PrivacyPage.tsx
│   │   ├── ProductPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── RecipesPage.tsx
│   │   ├── SummaryPage.tsx
│   │   ├── TermsPage.tsx
│   │   └── WorkoutsPage.tsx
│   ├── services/                # API service functions
│   │   ├── achievements.ts      # Achievement system
│   │   ├── aiChat.ts            # AI chat service
│   │   ├── aiInsights.ts        # AI insights generation
│   │   ├── analytics.ts         # Advanced analytics (correlations, predictions)
│   │   ├── audio.ts             # Voice transcription (Whisper)
│   │   ├── chat.ts              # Chat conversation persistence
│   │   ├── dailyLogs.ts         # Daily summary aggregation
│   │   ├── dailySummary.ts      # Daily summary service
│   │   ├── exerciseLibrary.ts   # Exercise library with METs
│   │   ├── foodDatabase.ts     # USDA Food Database API
│   │   ├── groceryLists.ts      # Grocery list management
│   │   ├── imageUpload.ts       # Image upload to Supabase
│   │   ├── mealPlanning.ts     # Meal planning service
│   │   ├── mealTemplates.ts     # Meal template management
│   │   ├── meals.ts             # Meal CRUD operations
│   │   ├── migrateGuestData.ts # Guest to account migration
│   │   ├── notifications.ts    # Browser notifications
│   │   ├── recipes.ts           # Recipe management
│   │   ├── streak.ts            # Streak calculation
│   │   ├── water.ts             # Water intake operations
│   │   ├── weightTracking.ts   # Weight logging
│   │   └── workouts.ts         # Workout CRUD operations
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts             # All type definitions
│   ├── utils/                   # Utility functions
│   ├── App.tsx                  # Main app component with routing
│   ├── main.tsx                 # Entry point with React Query setup
│   └── index.css                # Global styles and Tailwind
├── public/                      # Static assets
│   ├── favicon.ico
│   ├── manifest.json            # PWA manifest
│   └── service-worker.js        # Service worker for PWA
├── api/                         # Backend API routes (Vercel serverless)
│   └── chat.ts                  # OpenAI API proxy
├── .env.example                 # Environment variables template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.ts               # Vite configuration
├── vercel.json                  # Vercel deployment configuration
├── supabase_schema.sql          # Main database schema
├── exercise_library_schema.sql  # Exercise library schema
├── exercise_library_data.sql    # Exercise data
├── weight_tracking_schema.sql   # Weight tracking schema
├── achievements_recipes_schema.sql # Recipes, meal plans, grocery lists, achievements
├── rls_policies_verification.sql # RLS policies setup
├── rls_policies_cleanup.sql     # RLS policies cleanup
└── README.md                    # This file
```

## 🗄️ Database Schema

The application uses Supabase (PostgreSQL) with the following tables:

### Core Tables
- **user_profiles** - User information, goals, preferences, reminder settings
- **meals** - Meal logs with nutrition data
- **exercises** - Exercise/workout logs
- **daily_logs** - Aggregated daily summaries (water intake, totals)
- **weight_logs** - Weight and body composition tracking
- **meal_templates** - Saved meal templates for quick logging

### Advanced Features
- **recipes** - User recipes with ingredients and instructions
- **meal_plans** - Weekly meal planning data
- **grocery_lists** - Shopping lists generated from meal plans
- **achievements** - User achievement records
- **chat_conversations** - AI chat conversation history

### Reference Data
- **exercise_library** - Exercise database with METs values (150+ exercises)

### Storage Buckets
- **chat-images** - Images uploaded in chat conversations
- **recipe-images** - Recipe images (optional)

### Security
All tables have **Row Level Security (RLS)** enabled with policies ensuring:
- Users can only access their own data (`auth.uid() = user_id`)
- Anonymous users can access their own data
- Exercise library is publicly readable (reference data)

See SQL schema files for complete table definitions, indexes, triggers, and RLS policies.

## 🔐 Authentication

The app supports two authentication modes:

1. **Email/Password Authentication** - Traditional signup/login
2. **Anonymous Authentication** - Guest mode using Supabase Anonymous Auth

### Guest Mode Features
- Full app functionality without signup
- Data persisted in Supabase
- **Complete Data Migration** when converting to account:
  - User profiles
  - Meals and workouts
  - Daily logs
  - Weight logs
  - Recipes
  - Meal plans
  - Grocery lists
  - Achievements
  - Chat conversations
  - Meal templates

## 🎨 Design System

The application uses a custom dark theme design system:

### Colors
- **Obsidian** (`#0A0A0A`) - Background
- **Charcoal** (`#1A1A1A`) - Surface
- **Concrete** (`#2A2A2A`) - Panels
- **Acid Green** (`#00FF41`) - Primary accent
- **Success** - Green for positive indicators
- **Error** - Red for errors/warnings
- **Dim** - Gray for secondary text

### Typography
- **Inter** - Body text
- **Space Grotesk** - Headings
- **JetBrains Mono** - Monospace (labels, code)

### Components
- Card-based layouts with consistent spacing
- Smooth transitions and animations
- Loading skeletons (replaces spinners)
- Improved empty states with helpful messages
- Consistent button styles and form inputs

## 📱 Features Breakdown

### Meal Logging
- Manual entry with all nutrition fields
- **USDA Food Database Search** - Search 300,000+ foods
- Meal templates for quick logging
- Copy previous day's meals
- Edit and delete functionality
- Multiple meal types with icons
- Optional carbs and fats fields
- AI-powered natural language logging
- Image recognition for meals

### Workout Tracking
- Manual workout entry
- **Exercise Library** with 150+ exercises
- **METs-based Calorie Calculation** - Accurate calorie burn calculation
- Automatic calorie calculation based on user weight
- Edit and delete functionality
- Workout type categorization
- Multiple exercises per workout
- AI-powered natural language logging

### Analytics
- **Time Range Selector:** 7d, 30d, 3m, 1y, custom
- **Calorie Balance Charts:** Bar charts showing consumed vs burned
- **Protein Intake Trends:** Line charts
- **Macronutrients Breakdown:** Area charts
- **Weight Trends:** Line charts with BMI and goal lines
- **Water & Workout Statistics:** Summary cards
- **Correlation Analysis:**
  - Weight vs Calories correlation
  - Protein vs Workouts correlation
  - Scatter charts with correlation coefficients
- **Predictions:**
  - Weight prediction based on trends
  - Days to goal calculation
  - Trend analysis
- **Summary Statistics:** Averages, totals, trends

### AI Chat
- Natural language meal/workout logging
- **Voice Input** with transcription (Whisper)
- **Image Upload** and analysis (Vision)
- Action execution (auto-logging)
- Conversation persistence
- Enhanced context awareness (daily log, profile, goals)
- Typing animations
- Streaming responses
- Chat history management

### Recipe Management
- Create recipes with ingredients and instructions
- Recipe scaling for different serving sizes
- Automatic nutrition calculation
- Recipe images
- Tags and categories
- Favorite recipes
- Edit and delete functionality
- Integration with meal planning

### Meal Planning
- Weekly calendar view (Monday-Sunday)
- Add recipes or custom meals
- Multiple meal types per day
- Week navigation
- Visual planning interface
- Generate grocery lists from plans

### Grocery Lists
- Auto-generate from meal plans
- Smart ingredient aggregation
- Automatic categorization
- Quantity and unit conversion
- Check off items
- Multiple lists support
- Manual list creation

### Achievements
- **Streak Achievements:** 7, 30, 100 days
- **Goal Achievements:** Calorie goal, Protein goal
- **Milestone Achievements:** First meal, First workout, 10 meals, 10 workouts, 30 days
- **Special Achievements:** Perfect week
- Progress tracking
- Achievement badges
- Unlock notifications

### Weight Tracking
- Daily weight logging
- Quick entry from dashboard
- BMI calculation
- Body composition tracking
- Weight trends visualization
- Goal tracking
- Integration with analytics

## 🚢 Deployment

### Vercel (Recommended)

1. **Push code to Git repository** (GitHub/GitLab/Bitbucket)

2. **Import project in Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "New Project"
   - Import your repository

3. **Configure environment variables:**
   ```
   VITE_SUPABASE_URL=your_production_supabase_url
   VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   VITE_USDA_API_KEY=your_usda_api_key (optional)
   VITE_APP_ENV=production
   VITE_API_URL=/api/chat
   VITE_USE_BACKEND_PROXY=true
   ```

4. **Deploy**

### Backend API Proxy (Optional)

For production, set up a backend API proxy to secure OpenAI API calls:

1. Create `api/chat.ts` in your Vercel project
2. The proxy handles:
   - Rate limiting
   - Server-side validation
   - API key security
   - Error handling

See `api/chat.ts` for implementation.

### Environment Variables for Production

```env
# Supabase
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key

# USDA Food Database (optional)
VITE_USDA_API_KEY=your_usda_api_key

# App Configuration
VITE_APP_ENV=production
VITE_API_URL=/api/chat
VITE_USE_BACKEND_PROXY=true
```

## 🔒 Security

### Database Security
- **Row Level Security (RLS)** on all tables
- Users can only access their own data
- Anonymous users have isolated data
- Policies verified and tested

### API Security
- Secure API key handling (environment variables)
- Backend proxy for OpenAI API (optional)
- Rate limiting (if using backend proxy)
- Server-side validation

### Authentication
- Secure password hashing (Supabase handles this)
- Anonymous authentication support
- Session management
- Token refresh

### Data Privacy
- Data isolation per user
- Secure image uploads with RLS policies
- No data sharing between users
- GDPR-compliant data handling

## 📝 API Keys Setup

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Add to `.env` as `VITE_OPENAI_API_KEY`

### USDA Food Database API Key (Optional)
1. Go to [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-sign-up.html)
2. Sign up for a free API key
3. Add to `.env` as `VITE_USDA_API_KEY`

### Supabase Setup
1. Create account at [Supabase](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings → API
4. Add to `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 🧪 Testing

The application includes:
- Error boundaries for graceful error handling
- Loading states and skeletons
- Empty states with helpful messages
- Form validation
- Input sanitization

## 📚 Documentation

- **User Documentation:** Available in-app at `/documentation`
- **Help Center:** FAQs and support at `/help`
- **API Documentation:** See service files in `src/services/`
- **Database Schema:** See SQL files in root directory

## 🐛 Troubleshooting

### Common Issues

**Guest mode not working:**
- Ensure Anonymous Authentication is enabled in Supabase Dashboard
- Check Supabase URL and anon key in `.env`

**Food search not working:**
- Add `VITE_USDA_API_KEY` to `.env`
- Get free API key from [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-sign-up.html)

**AI chat not responding:**
- Verify `VITE_OPENAI_API_KEY` is set
- Check API key is valid and has credits
- Check browser console for errors

**RLS policy errors:**
- Run `rls_policies_verification.sql` in Supabase SQL Editor
- Verify all tables have RLS enabled
- Check policy names match table names

## 🎯 Roadmap

### Completed (v1.0)
- ✅ Core meal and workout logging
- ✅ AI chat with voice and image support
- ✅ Advanced analytics with correlations and predictions
- ✅ Weight tracking with BMI
- ✅ Streak tracking
- ✅ Meal templates
- ✅ Exercise library with METs
- ✅ Guest mode with complete data migration
- ✅ Reminders and notifications
- ✅ Responsive mobile design
- ✅ Edit functionality for meals/workouts
- ✅ Copy previous day meals
- ✅ Loading skeletons
- ✅ Improved empty states
- ✅ Recipe management
- ✅ Meal planning
- ✅ Grocery lists
- ✅ Achievements system
- ✅ USDA Food Database integration
- ✅ PWA features
- ✅ Pull-to-refresh
- ✅ Error boundaries
- ✅ RLS policies verification

### Future Enhancements
- [ ] Barcode scanner for meal logging
- [ ] Social features and sharing
- [ ] Integration with wearables (Fitbit, Apple Health, Google Fit)
- [ ] Export data (CSV, PDF)
- [ ] Advanced AI coaching features
- [ ] Meal photo recognition improvements
- [ ] Nutrition label scanning
- [ ] Community challenges
- [ ] Meal sharing and social feed

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

- **OpenAI** - For GPT-4o, Whisper, and Vision APIs
- **Supabase** - For backend infrastructure
- **USDA** - For FoodData Central API
- **Radix UI** - For accessible components
- **Recharts** - For beautiful charts
- **Vercel** - For deployment platform

---

**Built with ❤️ using React, TypeScript, Supabase, and OpenAI**

*NutriScope - Your AI-powered health and fitness companion*
