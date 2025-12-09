/**
 * Retry utility for network requests
 */

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = (error) => {
      // Retry on network errors or 5xx errors
      if (!error) return false
      if (error.message?.includes('network') || error.message?.includes('Network')) return true
      if (error.status >= 500 && error.status < 600) return true
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true
      return false
    },
    onRetry,
  } = options

  let lastError: any
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      attempt++

      if (attempt > maxRetries || !retryCondition(error)) {
        throw error
      }

      if (onRetry) {
        onRetry(attempt, error)
      }

      // Exponential backoff: delay * 2^(attempt - 1)
      const delay = retryDelay * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Create a retry wrapper for React Query
 */
export function withRetry<T>(
  queryFn: () => Promise<T>,
  options?: RetryOptions
): () => Promise<T> {
  return () => retry(queryFn, options)
}

