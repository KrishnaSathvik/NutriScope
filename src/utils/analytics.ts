/**
 * Google Analytics Integration
 * Tracks page views and custom events
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

class GoogleAnalytics {
  private measurementId: string | null = null
  private isInitialized = false

  /**
   * Initialize Google Analytics
   */
  init(measurementId: string) {
    if (this.isInitialized || typeof window === 'undefined') return

    this.measurementId = measurementId
    this.isInitialized = true

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer!.push(args)
    }
    window.gtag = gtag

    // Load Google Analytics script
    const script1 = document.createElement('script')
    script1.async = true
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script1)

    // Initialize gtag
    const script2 = document.createElement('script')
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_path: window.location.pathname,
      });
    `
    document.head.appendChild(script2)
  }

  /**
   * Track page view
   */
  pageview(path: string, title?: string) {
    if (!this.isInitialized || !window.gtag) return

    window.gtag('config', this.measurementId!, {
      page_path: path,
      page_title: title,
    })
  }

  /**
   * Track custom event
   */
  event(action: string, category?: string, label?: string, value?: number) {
    if (!this.isInitialized || !window.gtag) return

    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, params?: Record<string, any>) {
    if (!this.isInitialized || !window.gtag) return

    window.gtag('event', action, params)
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>) {
    if (!this.isInitialized || !window.gtag) return

    window.gtag('set', 'user_properties', properties)
  }

  /**
   * Track conversion
   */
  conversion(eventName: string, value?: number, currency?: string) {
    if (!this.isInitialized || !window.gtag) return

    window.gtag('event', 'conversion', {
      send_to: eventName,
      value: value,
      currency: currency || 'USD',
    })
  }
}

// Export singleton instance
export const analytics = new GoogleAnalytics()

/**
 * Initialize Google Analytics with measurement ID from environment
 */
export function initGoogleAnalytics() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID

  if (!measurementId) {
    if (import.meta.env.DEV) {
      console.warn('Google Analytics measurement ID not configured. Add VITE_GA_MEASUREMENT_ID to enable analytics.')
    }
    return
  }

  analytics.init(measurementId)
}

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  analytics.pageview(path, title)
}

/**
 * Track custom event
 */
export function trackEvent(action: string, category?: string, label?: string, value?: number) {
  analytics.event(action, category, label, value)
}

/**
 * Track meal logging
 */
export function trackMealLogged(mealType: string, calories: number) {
  analytics.event('meal_logged', 'meals', mealType, calories)
}

/**
 * Track workout logged
 */
export function trackWorkoutLogged(workoutType: string, duration?: number) {
  analytics.event('workout_logged', 'workouts', workoutType, duration)
}

/**
 * Track AI chat interaction
 */
export function trackAIChat(messageLength: number, hasImage: boolean) {
  analytics.event('ai_chat', 'chat', hasImage ? 'with_image' : 'text_only', messageLength)
}

/**
 * Track recipe saved
 */
export function trackRecipeSaved(recipeName: string) {
  analytics.event('recipe_saved', 'recipes', recipeName)
}

/**
 * Track weight logged
 */
export function trackWeightLogged(weight: number) {
  analytics.event('weight_logged', 'health', 'weight', weight)
}

/**
 * Track water logged
 */
export function trackWaterLogged(amount: number) {
  analytics.event('water_logged', 'health', 'water', amount)
}

/**
 * Track user sign up
 */
export function trackSignUp(method: 'email' | 'google' | 'guest') {
  analytics.event('sign_up', 'user', method)
}

/**
 * Track user login
 */
export function trackLogin(method: 'email' | 'google' | 'guest') {
  analytics.event('login', 'user', method)
}

