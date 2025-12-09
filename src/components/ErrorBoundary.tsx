import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { logger } from '@/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error (always logged, but formatted differently in dev/prod)
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    // Log to error tracking service (Sentry) if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset: () => void
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  // Determine error type and provide helpful messages
  const getErrorInfo = () => {
    if (!error) {
      return {
        title: 'Something went wrong',
        message: "We're sorry, but something unexpected happened. Please try again.",
        action: 'Try Again',
      }
    }

    const errorMessage = error.message?.toLowerCase() || ''
    const errorStack = error.stack?.toLowerCase() || ''

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('failed to fetch') ||
      errorStack.includes('network')
    ) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        action: 'Retry Connection',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again',
        ],
      }
    }

    // Authentication errors
    if (
      errorMessage.includes('auth') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401')
    ) {
      return {
        title: 'Authentication Error',
        message: 'Your session may have expired. Please sign in again.',
        action: 'Sign In',
        suggestions: [
          'Sign out and sign back in',
          'Clear your browser cache',
          'Check if your account is still active',
        ],
      }
    }

    // Database errors
    if (
      errorMessage.includes('database') ||
      errorMessage.includes('supabase') ||
      errorMessage.includes('postgres')
    ) {
      return {
        title: 'Data Error',
        message: 'There was an issue accessing your data. Please try again in a moment.',
        action: 'Retry',
        suggestions: [
          'Wait a moment and try again',
          'Refresh the page',
          'Contact support if the issue persists',
        ],
      }
    }

    // Default
    return {
      title: 'Something went wrong',
      message: "We're sorry, but something unexpected happened. Our team has been notified.",
      action: 'Try Again',
      suggestions: [
        'Try refreshing the page',
        'Clear your browser cache',
        'Contact support if the issue persists',
      ],
    }
  }

  const errorInfo = getErrorInfo()

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="card-modern max-w-2xl w-full p-6 md:p-8 text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-error/20 border border-error/30 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-error" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-text font-mono mb-3 md:mb-4">
          {errorInfo.title}
        </h1>
        
        <p className="text-dim font-mono text-sm md:text-base mb-4 md:mb-6 max-w-md mx-auto">
          {errorInfo.message}
        </p>

        {errorInfo.suggestions && (
          <div className="mb-6 md:mb-8 text-left max-w-md mx-auto">
            <p className="text-xs font-mono uppercase tracking-wider text-dim mb-3">Suggestions:</p>
            <ul className="space-y-2">
              {errorInfo.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-dim font-mono">
                  <span className="text-acid mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {import.meta.env.DEV && error && (
          <div className="mb-6 md:mb-8 p-4 bg-panel border border-border rounded-sm text-left">
            <div className="text-xs font-mono text-error mb-2 font-bold">Error Details:</div>
            <div className="text-xs font-mono text-dim break-all">{error.message}</div>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs font-mono text-dim cursor-pointer hover:text-text">
                  Stack Trace
                </summary>
                <pre className="text-xs font-mono text-dim mt-2 overflow-auto scrollbar-hide max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          <button
            onClick={onReset}
            className="btn-primary flex items-center justify-center gap-2 text-sm md:text-base py-2.5 md:py-3 px-4 md:px-6"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => {
              onReset()
              window.location.href = '/dashboard'
            }}
            className="btn-secondary flex items-center justify-center gap-2 text-sm md:text-base py-2.5 md:py-3 px-4 md:px-6"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Wrapper component to use hooks
export default function ErrorBoundary({ children, fallback }: Props) {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>
}

