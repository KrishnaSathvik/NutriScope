# How to Track Metrics - Performance Monitoring Guide

## 🎯 **Automatic Tracking**

### **What Gets Tracked Automatically:**

1. **Page Load Metrics** (on every page load)
   - First Contentful Paint (FCP)
   - Time to First Byte (TTFB)
   - Total Page Load Time
   - DNS lookup time
   - TCP connection time
   - Request/response time
   - DOM processing time

2. **Web Vitals** (automatically via Performance Observer)
   - **LCP** (Largest Contentful Paint) - Main content load
   - **FID** (First Input Delay) - Interactivity
   - **CLS** (Cumulative Layout Shift) - Visual stability

3. **API Calls** (when using `trackAPICall` wrapper)

---

## 📊 **Where to View Metrics**

### **Development Mode:**

Open your browser's **Developer Console** (F12 or Cmd+Option+I):

```javascript
// You'll see logs like:
[2024-01-15T10:30:00.000Z] [DEBUG] Performance Metrics: {
  fcp: "1234ms",
  ttfb: "456ms",
  pageLoad: "2345ms"
}

[2024-01-15T10:30:01.000Z] [DEBUG] [Performance] lcp: 1234ms
[2024-01-15T10:30:01.000Z] [DEBUG] [Performance] fid: 45ms
[2024-01-15T10:30:01.500Z] [DEBUG] [Performance] cls: 0.05
```

### **Production Mode:**

Metrics are automatically sent to **Sentry** (if configured):
- Go to your Sentry dashboard
- Navigate to **Performance** section
- View metrics, traces, and performance data

---

## 🔧 **How to Track Custom Metrics**

### **1. Track API Calls**

Wrap your API calls with `trackAPICall`:

```typescript
import { trackAPICall } from '@/utils/performance'

// Example: Track AI chat API call
const response = await trackAPICall('/api/chat', async () => {
  return await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello' }),
  }).then(r => r.json())
})
```

**What this does:**
- Measures time from start to finish
- Logs slow calls (>2 seconds) as warnings
- Records metric as `apiResponseTime`

### **2. Track Route Changes**

Track navigation performance:

```typescript
import { performanceMonitor } from '@/utils/performance'

// In your route change handler
const startTime = performance.now()

// After route change completes
const endTime = performance.now()
performanceMonitor.trackRouteChange('/dashboard', startTime, endTime)
```

### **3. Record Custom Metrics**

Track any custom metric:

```typescript
import { performanceMonitor } from '@/utils/performance'

// Track a custom action
performanceMonitor.recordMetric('mealFormSubmit', 150) // 150ms

// Track with page context
performanceMonitor.recordMetric('imageUpload', 2340, '/meals')

// Examples:
performanceMonitor.recordMetric('searchQuery', 89)
performanceMonitor.recordMetric('chartRender', 456)
performanceMonitor.recordMetric('dataFetch', 1234)
```

### **4. Get Metrics for Analysis**

Retrieve metrics programmatically:

```typescript
import { performanceMonitor } from '@/utils/performance'

// Get metrics for current page
const currentMetrics = performanceMonitor.getMetrics()
console.log('Current page metrics:', currentMetrics)
// {
//   fcp: 1234,
//   lcp: 2345,
//   fid: 45,
//   cls: 0.05,
//   pageLoadTime: 3456,
//   apiResponseTime: 890
// }

// Get metrics for specific page
const dashboardMetrics = performanceMonitor.getMetrics('/dashboard')

// Get all metrics
const allMetrics = performanceMonitor.getAllMetrics()
// Map<string, PerformanceMetrics>
```

---

## 📝 **Practical Examples**

### **Example 1: Track API Calls in Services**

```typescript
// src/services/meals.ts
import { trackAPICall } from '@/utils/performance'

export async function createMeal(mealData: MealData) {
  return trackAPICall('/api/meals', async () => {
    const { data, error } = await supabase
      .from('meals')
      .insert(mealData)
      .select()
      .single()
    
    if (error) throw error
    return data
  })
}
```

### **Example 2: Track Component Render Time**

```typescript
// src/components/HeavyComponent.tsx
import { useEffect, useRef } from 'react'
import { performanceMonitor } from '@/utils/performance'

export function HeavyComponent() {
  const renderStart = useRef(performance.now())
  
  useEffect(() => {
    const renderTime = performance.now() - renderStart.current
    performanceMonitor.recordMetric('heavyComponentRender', renderTime)
  }, [])
  
  return <div>...</div>
}
```

### **Example 3: Track User Actions**

```typescript
// src/pages/Dashboard.tsx
import { performanceMonitor } from '@/utils/performance'

function handleQuickAction(action: string) {
  const startTime = performance.now()
  
  // Perform action
  performAction(action)
    .then(() => {
      const duration = performance.now() - startTime
      performanceMonitor.recordMetric(`quickAction_${action}`, duration)
    })
}
```

### **Example 4: Track Form Submission**

```typescript
// src/components/MealForm.tsx
import { performanceMonitor } from '@/utils/performance'

async function handleSubmit(data: FormData) {
  const startTime = performance.now()
  
  try {
    await createMeal(data)
    const duration = performance.now() - startTime
    performanceMonitor.recordMetric('mealFormSubmit', duration)
  } catch (error) {
    const duration = performance.now() - startTime
    performanceMonitor.recordMetric('mealFormSubmitError', duration)
  }
}
```

---

## 🎯 **Integration Examples**

### **Add to Existing Services**

Let's add tracking to your AI chat service:

```typescript
// src/services/aiChat.ts
import { trackAPICall } from '@/utils/performance'

export async function chatWithAI(message: string) {
  return trackAPICall('/api/chat', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    return response.json()
  })
}
```

### **Add to Route Changes**

Track route performance in App.tsx:

```typescript
// src/App.tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { performanceMonitor } from '@/utils/performance'

function AppRoutes() {
  const location = useLocation()
  const routeStartTime = useRef(performance.now())
  
  useEffect(() => {
    const routeChangeTime = performance.now() - routeStartTime.current
    performanceMonitor.trackRouteChange(
      location.pathname,
      routeStartTime.current,
      performance.now()
    )
    routeStartTime.current = performance.now()
  }, [location.pathname])
  
  // ... rest of component
}
```

---

## 📈 **Monitoring Dashboard (Future Enhancement)**

You can create a performance dashboard component:

```typescript
// src/components/PerformanceDashboard.tsx
import { performanceMonitor } from '@/utils/performance'

export function PerformanceDashboard() {
  const metrics = performanceMonitor.getAllMetrics()
  
  return (
    <div>
      <h2>Performance Metrics</h2>
      {Array.from(metrics.entries()).map(([page, data]) => (
        <div key={page}>
          <h3>{page}</h3>
          <ul>
            <li>FCP: {data.fcp}ms</li>
            <li>LCP: {data.lcp}ms</li>
            <li>FID: {data.fid}ms</li>
            <li>CLS: {data.cls}</li>
            <li>Page Load: {data.pageLoadTime}ms</li>
            <li>API Response: {data.apiResponseTime}ms</li>
          </ul>
        </div>
      ))}
    </div>
  )
}
```

---

## 🔍 **Debugging Performance Issues**

### **Check Slow API Calls:**

```typescript
// Slow API calls (>2s) are automatically logged:
[WARN] Slow API call: /api/chat took 2345ms
```

### **Check Page Load Times:**

```typescript
// View in console:
[DEBUG] Page Load Breakdown: {
  dns: 12,
  tcp: 45,
  request: 123,
  response: 456,
  dom: 789,
  load: 234,
  total: 2345
}
```

### **Check Web Vitals:**

```typescript
// Good targets:
// LCP < 2.5s ✅
// FID < 100ms ✅
// CLS < 0.1 ✅
// FCP < 1.8s ✅
// TTFB < 800ms ✅
```

---

## 🚀 **Production Monitoring with Sentry**

### **Setup Sentry:**

1. Install Sentry:
```bash
pnpm add @sentry/react
```

2. Add environment variable:
```env
VITE_SENTRY_DSN=your_sentry_dsn_here
```

3. Metrics are automatically sent to Sentry!

### **View in Sentry:**

1. Go to Sentry Dashboard
2. Navigate to **Performance**
3. View:
   - Page load times
   - API response times
   - Web Vitals
   - Custom metrics
   - Error tracking

---

## 📋 **Quick Reference**

### **Import Functions:**

```typescript
import { 
  performanceMonitor,
  trackAPICall,
  trackPageLoad 
} from '@/utils/performance'
```

### **Common Metrics:**

```typescript
// Automatic:
- fcp (First Contentful Paint)
- lcp (Largest Contentful Paint)
- fid (First Input Delay)
- cls (Cumulative Layout Shift)
- ttfb (Time to First Byte)
- pageLoadTime

// Custom:
- apiResponseTime
- routeChangeTime
- customMetricName
```

### **View Metrics:**

```typescript
// Development: Browser Console
// Production: Sentry Dashboard
// Programmatic: performanceMonitor.getMetrics()
```

---

## ✅ **Summary**

**Automatic Tracking:**
- ✅ Page load metrics
- ✅ Web Vitals (LCP, FID, CLS)
- ✅ Navigation timing

**Manual Tracking:**
- ✅ API calls with `trackAPICall()`
- ✅ Custom metrics with `recordMetric()`
- ✅ Route changes with `trackRouteChange()`

**Viewing Metrics:**
- ✅ Development: Browser Console
- ✅ Production: Sentry Dashboard
- ✅ Programmatic: `getMetrics()` function

Start tracking metrics today to optimize your app's performance! 🚀

