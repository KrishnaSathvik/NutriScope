import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get from localStorage or default to 'system'
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme | null
      return stored && ['dark', 'light', 'system'].includes(stored) ? stored : 'system'
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return theme
    }
    return 'light' // Default to light theme
  })

  // Update resolved theme when theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }
      
      // Set initial value
      updateTheme(mediaQuery)
      
      // Listen for changes
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', updateTheme)
        return () => mediaQuery.removeEventListener('change', updateTheme)
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(updateTheme)
        return () => mediaQuery.removeListener(updateTheme)
      }
    } else {
      setResolvedTheme(theme)
    }
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    if (typeof document === 'undefined') return
    
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
  }, [resolvedTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

