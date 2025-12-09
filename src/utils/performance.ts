/**
 * Performance Monitoring Utilities
 * Tracks Web Vitals and custom performance metrics
 */

// Import logger - fallback to console if not available
const logger = {
  debug: (...args: any[]) => {
    if (import.meta.env.DEV) console.debug(...args)
  },
  warn: (...args: any[]) => console.warn(...args),
}

export interface PerformanceMetrics {
  // Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
  
  // Custom Metrics
  pageLoadTime?: number
  apiResponseTime?: number
  routeChangeTime?: number
  
  // Resource Metrics
  bundleSize?: number
  imageLoadTime?: number
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private observers: PerformanceObserver[] = []

  constructor() {
    if (typeof window === 'undefined') return
    this.initWebVitals()
  }

  /**
   * Initialize Web Vitals tracking
   */
  private initWebVitals() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      logger.warn('Performance Observer not supported')
      return
    }

    // Track Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        if (lastEntry) {
          this.recordMetric('lcp', Math.round(lastEntry.renderTime || lastEntry.loadTime))
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)
    } catch (e) {
      logger.debug('LCP observer not supported:', e)
    }

    // Track First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.recordMetric('fid', Math.round(entry.processingStart - entry.startTime))
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)
    } catch (e) {
      logger.debug('FID observer not supported:', e)
    }

    // Track Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.recordMetric('cls', Math.round(clsValue * 1000) / 1000)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)
    } catch (e) {
      logger.debug('CLS observer not supported:', e)
    }

    // Track Navigation Timing
    this.trackNavigationTiming()
  }

  /**
   * Track navigation timing metrics
   */
  private trackNavigationTiming() {
    if (typeof window === 'undefined' || !window.performance) return

    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        
        if (perfData) {
          // First Contentful Paint
          const fcp = perfData.domContentLoadedEventEnd - perfData.fetchStart
          this.recordMetric('fcp', Math.round(fcp))

          // Time to First Byte
          const ttfb = perfData.responseStart - perfData.fetchStart
          this.recordMetric('ttfb', Math.round(ttfb))

          // Page Load Time
          const pageLoadTime = perfData.loadEventEnd - perfData.fetchStart
          this.recordMetric('pageLoadTime', Math.round(pageLoadTime))

          // Log metrics
          logger.debug('Performance Metrics:', {
            fcp: `${Math.round(fcp)}ms`,
            ttfb: `${Math.round(ttfb)}ms`,
            pageLoad: `${Math.round(pageLoadTime)}ms`,
          })
        }
      }, 0)
    })
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: keyof PerformanceMetrics, value: number, page?: string) {
    const pageKey = page || window.location.pathname
    const current = this.metrics.get(pageKey) || {}
    this.metrics.set(pageKey, { ...current, [name]: value })

    // Log in development
    if (import.meta.env.DEV) {
      logger.debug(`[Performance] ${name}:`, `${value}ms`)
    }

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        ;(window as any).Sentry.setMeasurement(name, value, 'millisecond')
      } catch (e) {
        // Sentry not available or error
      }
    }
  }

  /**
   * Track API response time
   */
  trackAPIResponse(url: string, startTime: number, endTime: number) {
    const responseTime = endTime - startTime
    this.recordMetric('apiResponseTime', Math.round(responseTime))
    
    // Log slow API calls
    if (responseTime > 2000) {
      logger.warn(`Slow API call: ${url} took ${Math.round(responseTime)}ms`)
    }
  }

  /**
   * Track route change time
   */
  trackRouteChange(route: string, startTime: number, endTime: number) {
    const changeTime = endTime - startTime
    this.recordMetric('routeChangeTime', Math.round(changeTime), route)
  }

  /**
   * Get metrics for a specific page
   */
  getMetrics(page?: string): PerformanceMetrics | undefined {
    const pageKey = page || window.location.pathname
    return this.metrics.get(pageKey)
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return this.metrics
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear()
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Track page load performance
 */
export function trackPageLoad() {
  if (typeof window === 'undefined') return

  window.addEventListener('load', () => {
    const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (perfData) {
      const metrics = {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        request: perfData.responseStart - perfData.requestStart,
        response: perfData.responseEnd - perfData.responseStart,
        dom: perfData.domContentLoadedEventEnd - perfData.responseEnd,
        load: perfData.loadEventEnd - perfData.domContentLoadedEventEnd,
        total: perfData.loadEventEnd - perfData.fetchStart,
      }

      logger.debug('Page Load Breakdown:', metrics)
    }
  })
}

/**
 * Track API call performance
 */
export function trackAPICall<T>(
  url: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  return apiCall()
    .then((result) => {
      const endTime = performance.now()
      performanceMonitor.trackAPIResponse(url, startTime, endTime)
      return result
    })
    .catch((error) => {
      const endTime = performance.now()
      performanceMonitor.trackAPIResponse(url, startTime, endTime)
      throw error
    })
}

