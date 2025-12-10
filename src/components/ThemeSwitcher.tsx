import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const themes: Array<{ value: 'dark' | 'light' | 'system'; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="flex items-center gap-1 p-1 bg-panel border border-border rounded-sm">
      {themes.map((themeOption) => {
        const Icon = themeOption.icon
        const isActive = theme === themeOption.value
        
        return (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`relative flex items-center justify-center h-8 w-8 rounded-sm transition-all duration-200 ${
              isActive
                ? 'bg-surface text-text'
                : 'text-dim hover:text-text hover:bg-surface/50'
            }`}
            aria-label={`Switch to ${themeOption.label} theme`}
            title={`${themeOption.label}${themeOption.value === 'system' ? ` (${resolvedTheme})` : ''}`}
            style={{ minHeight: '2rem', minWidth: '2rem' }}
          >
            <Icon 
              className={`w-4 h-4 transition-all ${isActive ? 'fill-text' : ''}`} 
              strokeWidth={isActive ? 2.5 : 2} 
            />
            {isActive && (
              <div className="absolute inset-0 border-2 border-acid rounded-sm pointer-events-none" />
            )}
          </button>
        )
      })}
    </div>
  )
}

