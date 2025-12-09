import { ReactNode, useRef, useEffect } from 'react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: ReactNode
  disabled?: boolean
  threshold?: number
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false,
  threshold = 80 
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isRefreshing, pullDistance, pullProgress, elementRef } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  })

  useEffect(() => {
    if (containerRef.current) {
      const scrollableElement = containerRef.current.querySelector('[data-scrollable]') as HTMLElement
      if (scrollableElement) {
        elementRef.current = scrollableElement
      } else {
        elementRef.current = containerRef.current
      }
    }
  }, [elementRef])

  const showIndicator = pullDistance > 0 || isRefreshing
  const rotation = pullProgress * 360

  return (
    <div ref={containerRef} className="relative">
      {/* Pull to refresh indicator */}
      {showIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance, threshold)}px`,
            transform: `translateY(${Math.min(pullDistance - threshold, 0)}px)`,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <RefreshCw 
              className={`w-6 h-6 text-acid transition-transform duration-200 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${rotation}deg)`,
              }}
            />
            {pullDistance >= threshold && !isRefreshing && (
              <span className="text-xs font-mono text-acid uppercase tracking-wider">
                Release to refresh
              </span>
            )}
            {isRefreshing && (
              <span className="text-xs font-mono text-acid uppercase tracking-wider">
                Refreshing...
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Content */}
      <div 
        data-scrollable
        className="h-full overflow-y-auto"
        style={{
          transform: showIndicator ? `translateY(${Math.min(pullDistance, threshold)}px)` : 'translateY(0)',
          transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}

