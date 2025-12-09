// Simple toast implementation
import { createContext, useContext, useState, ReactNode } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...newToast, id }])
    setTimeout(() => dismiss(id), 5000)
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`card-modern border-l-4 ${
              toast.variant === 'destructive'
                ? 'border-error bg-error/10'
                : 'border-acid bg-acid/10'
            }`}
          >
            {toast.title && (
              <div className="font-bold text-text text-sm font-mono uppercase tracking-wider mb-1">
                {toast.title}
              </div>
            )}
            {toast.description && (
              <div className="text-xs text-dim font-mono">{toast.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      toast: () => {},
      dismiss: () => {},
      toasts: [],
    }
  }
  return context
}

export function Toaster() {
  return null // ToastProvider handles rendering
}

