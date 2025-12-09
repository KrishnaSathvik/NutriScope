import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useState, useRef, useEffect } from 'react'

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const themes: Array<{ value: 'dark' | 'light' | 'system'; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  const currentTheme = themes.find(t => t.value === theme) || themes[2]
  const CurrentIcon = currentTheme.icon

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative flex items-center justify-center w-8 h-8 rounded-sm border border-border bg-surface hover:bg-panel transition-all duration-200 group"
        aria-label="Toggle theme"
        title={`Current theme: ${currentTheme.label}${theme === 'system' ? ` (${resolvedTheme})` : ''}`}
      >
        <CurrentIcon className="w-4 h-4 text-text transition-transform group-hover:scale-110" strokeWidth={2} />
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-40 bg-surface border border-border rounded-sm shadow-lg z-50 overflow-hidden">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon
              const isActive = theme === themeOption.value
              
              return (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value)
                    setShowMenu(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-acid/20 text-acid border-l-2 border-acid'
                      : 'text-dim hover:text-text hover:bg-panel'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-acid' : 'text-dim'}`} strokeWidth={2} />
                  <span className="text-xs font-mono uppercase tracking-wider flex-1">{themeOption.label}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-acid rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

