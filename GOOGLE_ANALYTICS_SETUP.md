# Google Analytics Setup Guide ✅

## 🎯 **What Was Implemented**

### **1. Google Analytics Integration** ✅

- ✅ Google Analytics utility (`src/utils/analytics.ts`)
- ✅ Automatic page view tracking
- ✅ Custom event tracking functions
- ✅ Integration with React Router
- ✅ Performance monitoring integration

### **2. Pre-built Event Tracking Functions**

- ✅ `trackMealLogged()` - Track meal logging
- ✅ `trackWorkoutLogged()` - Track workout logging
- ✅ `trackAIChat()` - Track AI chat interactions
- ✅ `trackRecipeSaved()` - Track recipe saves
- ✅ `trackWeightLogged()` - Track weight logging
- ✅ `trackWaterLogged()` - Track water intake
- ✅ `trackSignUp()` - Track user sign ups
- ✅ `trackLogin()` - Track user logins

---

## 🚀 **Setup Instructions**

### **Step 1: Get Your Google Analytics Measurement ID**

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a property or select existing one
3. Go to **Admin** → **Data Streams**
4. Click on your web stream
5. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### **Step 2: Add to Environment Variables**

Add your measurement ID to your `.env` file:

```env
# Google Analytics
VITE_GA_MEASUREMENT_ID=G-DDB8ZL2FD4
```

**For Production:**
- Add to Vercel/Netlify environment variables
- Or add to your `.env.production` file

---

## 📊 **How It Works**

### **Automatic Tracking:**

1. **Page Views** - Automatically tracked on route changes
2. **Performance Metrics** - Integrated with performance monitoring

### **Manual Event Tracking:**

```typescript
import { 
  trackMealLogged,
  trackWorkoutLogged,
  trackAIChat,
  trackRecipeSaved,
  trackWeightLogged,
  trackWaterLogged,
  trackSignUp,
  trackLogin
} from '@/utils/analytics'

// Track meal logging
trackMealLogged('breakfast', 450)

// Track workout
trackWorkoutLogged('running', 30)

// Track AI chat
trackAIChat(50, false) // message length, has image

// Track recipe save
trackRecipeSaved('Chicken Curry')

// Track weight logging
trackWeightLogged(70.5)

// Track water intake
trackWaterLogged(500)

// Track sign up
trackSignUp('email')

// Track login
trackLogin('google')
```

---

## 🔧 **Custom Event Tracking**

### **Track Any Custom Event:**

```typescript
import { trackEvent } from '@/utils/analytics'

// Generic event tracking
trackEvent('button_click', 'ui', 'save_button')
trackEvent('form_submit', 'forms', 'meal_form', 1)
```

### **Track with Custom Parameters:**

```typescript
import { analytics } from '@/utils/analytics'

analytics.trackEngagement('custom_action', {
  custom_parameter: 'value',
  another_param: 123,
})
```

---

## 📝 **Integration Examples**

### **Example 1: Track Meal Logging**

```typescript
// src/services/meals.ts
import { trackMealLogged } from '@/utils/analytics'

export async function createMeal(mealData: MealData) {
  const meal = await supabase.from('meals').insert(mealData)
  
  // Track analytics
  trackMealLogged(mealData.meal_type, mealData.calories)
  
  return meal
}
```

### **Example 2: Track Workout Logging**

```typescript
// src/services/workouts.ts
import { trackWorkoutLogged } from '@/utils/analytics'

export async function createWorkout(workoutData: WorkoutData) {
  const workout = await supabase.from('workouts').insert(workoutData)
  
  // Track analytics
  trackWorkoutLogged(workoutData.exercise_type, workoutData.duration)
  
  return workout
}
```

### **Example 3: Track AI Chat**

```typescript
// src/services/aiChat.ts
import { trackAIChat } from '@/utils/analytics'

export async function chatWithAI(message: string, imageUrl?: string) {
  // ... chat logic ...
  
  // Track analytics
  trackAIChat(message.length, !!imageUrl)
  
  return response
}
```

### **Example 4: Track User Actions**

```typescript
// src/pages/AuthPage.tsx
import { trackSignUp, trackLogin } from '@/utils/analytics'

function handleSignUp(method: 'email' | 'google') {
  // ... sign up logic ...
  trackSignUp(method)
}

function handleLogin(method: 'email' | 'google') {
  // ... login logic ...
  trackLogin(method)
}
```

---

## 🎯 **What Gets Tracked Automatically**

### **Page Views:**
- ✅ Every route change
- ✅ Page path and title
- ✅ Automatic on navigation

### **Performance:**
- ✅ Integrated with performance monitoring
- ✅ Page load times
- ✅ Route change times

---

## 🔍 **View Analytics Data**

### **In Google Analytics Dashboard:**

1. Go to [Google Analytics](https://analytics.google.com)
2. Select your property
3. View:
   - **Realtime** - See current users
   - **Reports** - View page views, events, etc.
   - **Engagement** - See user engagement metrics
   - **Events** - View custom events

### **Common Reports:**

- **Page Views** - See which pages are most popular
- **Events** - Track custom events (meals, workouts, etc.)
- **User Engagement** - See how users interact with your app
- **Conversion** - Track sign ups, logins, etc.

---

## 🔒 **Privacy & GDPR**

### **EEA Consent Mode:**

If you have users in the European Economic Area (EEA), you should:

1. **Add Consent Mode** - Configure consent mode in Google Analytics
2. **Cookie Consent** - Show cookie consent banner
3. **Respect User Choice** - Only track if user consents

### **Example Consent Implementation:**

```typescript
// src/utils/analytics.ts
export function setConsentMode(consent: boolean) {
  if (!window.gtag) return
  
  window.gtag('consent', 'update', {
    analytics_storage: consent ? 'granted' : 'denied',
  })
}
```

---

## 📋 **Environment Variables**

### **Required:**

```env
VITE_GA_MEASUREMENT_ID=G-DDB8ZL2FD4
```

### **Optional (for consent mode):**

```env
VITE_GA_ENABLE_CONSENT_MODE=true
```

---

## ✅ **Summary**

**What's Working:**
- ✅ Google Analytics initialized automatically
- ✅ Page views tracked on route changes
- ✅ Custom event tracking functions ready
- ✅ Integration with performance monitoring

**Next Steps:**
1. Add `VITE_GA_MEASUREMENT_ID` to your `.env` file
2. Add tracking calls to your services (meals, workouts, etc.)
3. View analytics in Google Analytics dashboard
4. (Optional) Add consent mode for EEA users

**Your Measurement ID:** `G-DDB8ZL2FD4` (from the screenshot)

Add this to your `.env` file and you're ready to go! 🚀

