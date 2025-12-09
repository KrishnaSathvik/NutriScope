import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { initSentry } from './lib/sentry'

// Initialize theme before React renders to prevent flash
const initializeTheme = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  
  const stored = localStorage.getItem('theme')
  const theme = stored && ['dark', 'light', 'system'].includes(stored) ? stored : 'system'
  
  let resolvedTheme: 'dark' | 'light' = 'light' // Default to light theme
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    resolvedTheme = theme as 'dark' | 'light'
  }
  
  const root = document.documentElement
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  
  // Remove dark class first to ensure clean state
  root.classList.remove('dark')
  
  if (resolvedTheme === 'dark') {
    root.classList.add('dark')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#020617')
    }
  } else {
    // Light theme - ensure dark class is removed
    root.classList.remove('dark')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#f5f5f5')
    }
  }
}

initializeTheme()

// Initialize error tracking (async, but don't block app startup)
initSentry().catch(() => {
  // Sentry initialization failed - app continues without error tracking
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Retry on network errors or 5xx errors
        if (failureCount >= 3) return false
        if (error?.message?.includes('network') || error?.message?.includes('Network')) return true
        if (error?.status >= 500 && error?.status < 600) return true
        if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return true
        return false
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Retry mutations only on network errors
        if (failureCount >= 2) return false
        if (error?.message?.includes('network') || error?.message?.includes('Network')) return true
        if (error?.status >= 500 && error?.status < 600) return true
        return false
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

// Register Service Worker for PWA
registerServiceWorker()
