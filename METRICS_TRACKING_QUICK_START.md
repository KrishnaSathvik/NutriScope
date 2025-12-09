# Metrics Tracking - Quick Start Guide 🚀

## ✅ **What's Already Tracking Automatically**

### **1. Page Load Metrics** (Every page load)
- ✅ First Contentful Paint (FCP)
- ✅ Time to First Byte (TTFB)
- ✅ Page Load Time
- ✅ DNS lookup time
- ✅ TCP connection time
- ✅ Request/response time
- ✅ DOM processing time

### **2. Web Vitals** (Automatic via Performance Observer)
- ✅ LCP (Largest Contentful Paint)
- ✅ FID (First Input Delay)
- ✅ CLS (Cumulative Layout Shift)

### **3. Route Changes** (Just added!)
- ✅ Tracks navigation speed
- ✅ Measures time between route changes

### **4. API Calls** (Just added to AI Chat!)
- ✅ Tracks `/api/chat` response time
- ✅ Warns if > 2 seconds

---

## 📊 **How to View Metrics**

### **Development Mode:**

1. **Open Browser Console** (F12 or Cmd+Option+I)
2. **Navigate through your app**
3. **Look for logs like:**

```
[DEBUG] Performance Metrics: {
  fcp: "1234ms",
  ttfb: "456ms",
  pageLoad: "2345ms"
}

[DEBUG] [Performance] lcp: 1234ms
[DEBUG] [Performance] fid: 45ms
[DEBUG] [Performance] cls: 0.05
[DEBUG] [Performance] apiResponseTime: 890ms
[DEBUG] [Performance] routeChangeTime: 123ms
```

**Slow API Warning:**
```
[WARN] Slow API call: /api/chat took 2345ms
```

---

## 🔧 **How to Add Tracking to Your Code**

### **Example 1: Track API Calls**

```typescript
// Before:
const response = await fetch('/api/endpoint')
const data = await response.json()

// After:
import { trackAPICall } from '@/utils/performance'

const data = await trackAPICall('/api/endpoint', async () => {
  const response = await fetch('/api/endpoint')
  return response.json()
})
```

**Already Added:**
- ✅ `src/services/aiChat.ts` - AI chat API calls

**To Add:**
- Add to other API calls in your services

---

### **Example 2: Track Custom Actions**

```typescript
import { performanceMonitor } from '@/utils/performance'

// Track form submission
async function handleSubmit(data: FormData) {
  const startTime = performance.now()
  
  try {
    await saveData(data)
    const duration = performance.now() - startTime
    performanceMonitor.recordMetric('formSubmit', duration)
  } catch (error) {
    const duration = performance.now() - startTime
    performanceMonitor.recordMetric('formSubmitError', duration)
  }
}

// Track component render
useEffect(() => {
  const renderTime = performance.now() - renderStartTime
  performanceMonitor.recordMetric('heavyComponentRender', renderTime)
}, [])
```

---

### **Example 3: Track Route Changes** (Already Added!)

```typescript
// Already implemented in App.tsx
useEffect(() => {
  const routeChangeTime = performance.now() - routeStartTime.current
  performanceMonitor.trackRouteChange(
    location.pathname,
    routeStartTime.current,
    performance.now()
  )
  routeStartTime.current = performance.now()
}, [location.pathname])
```

---

## 📈 **Get Metrics Programmatically**

```typescript
import { performanceMonitor } from '@/utils/performance'

// Get current page metrics
const metrics = performanceMonitor.getMetrics()
console.log('Current page:', metrics)
// {
//   fcp: 1234,
//   lcp: 2345,
//   fid: 45,
//   cls: 0.05,
//   pageLoadTime: 3456,
//   apiResponseTime: 890,
//   routeChangeTime: 123
// }

// Get metrics for specific page
const dashboardMetrics = performanceMonitor.getMetrics('/dashboard')

// Get all metrics
const allMetrics = performanceMonitor.getAllMetrics()
// Map<string, PerformanceMetrics>
```

---

## 🎯 **What to Track**

### **High Priority:**
1. ✅ **API Calls** - Already tracking AI chat
2. ✅ **Route Changes** - Already tracking
3. ⚠️ **Other API calls** - Add to meals, workouts, etc.
4. ⚠️ **Form submissions** - Track save/create operations
5. ⚠️ **Heavy operations** - Image uploads, data processing

### **Medium Priority:**
1. ⚠️ **Component renders** - Heavy components
2. ⚠️ **Search queries** - Food search, etc.
3. ⚠️ **Chart rendering** - Analytics charts
4. ⚠️ **Image loading** - Track image load times

---

## 🔍 **Where Metrics Are Logged**

### **Development:**
- ✅ Browser Console (automatic)
- ✅ Detailed breakdowns
- ✅ Slow call warnings

### **Production:**
- ✅ Sentry Dashboard (if configured)
- ✅ Performance section
- ✅ Error tracking

---

## 📋 **Quick Reference**

### **Import:**
```typescript
import { 
  performanceMonitor,    // For custom metrics
  trackAPICall,         // For API calls
  trackPageLoad         // Already called in main.tsx
} from '@/utils/performance'
```

### **Common Functions:**
```typescript
// Track API call
trackAPICall('/api/endpoint', async () => { ... })

// Record custom metric
performanceMonitor.recordMetric('metricName', value)

// Track route change
performanceMonitor.trackRouteChange(route, startTime, endTime)

// Get metrics
performanceMonitor.getMetrics() // Current page
performanceMonitor.getMetrics('/dashboard') // Specific page
performanceMonitor.getAllMetrics() // All pages
```

---

## ✅ **Summary**

**Already Tracking:**
- ✅ Page loads (automatic)
- ✅ Web Vitals (automatic)
- ✅ Route changes (just added)
- ✅ AI chat API calls (just added)

**To Add:**
- ⚠️ Other API calls
- ⚠️ Form submissions
- ⚠️ Heavy operations

**View Metrics:**
- ✅ Development: Browser Console
- ✅ Production: Sentry Dashboard

**Next Steps:**
1. Open your app in development
2. Check browser console for metrics
3. Add tracking to other API calls
4. Monitor slow calls (>2s warnings)

That's it! Your metrics are already being tracked automatically! 🎉

