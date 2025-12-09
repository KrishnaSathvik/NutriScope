import { useState, useEffect, useRef } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
  disabled?: boolean
}

export function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef<number>(0)
  const isPulling = useRef(false)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (disabled) return

    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top
      if (element.scrollTop > 0) return
      
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return
      if (element.scrollTop > 0) {
        isPulling.current = false
        setPullDistance(0)
        return
      }

      const currentY = e.touches[0].clientY
      const distance = Math.max(0, currentY - startY.current)
      
      if (distance > 0) {
        e.preventDefault() // Prevent default scroll
        setPullDistance(Math.min(distance, threshold * 1.5))
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling.current) return
      
      isPulling.current = false
      
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        setPullDistance(threshold)
        
        try {
          await onRefresh()
        } finally {
          setTimeout(() => {
            setIsRefreshing(false)
            setPullDistance(0)
          }, 300)
        }
      } else {
        setPullDistance(0)
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh, threshold, disabled, pullDistance, isRefreshing])

  return {
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    elementRef,
  }
}

