import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll main element to top when route changes
    const mainElement = document.querySelector('main')
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Use 'instant' for immediate scroll, 'smooth' for animated
      })
    }
    // Fallback: also scroll window (for pages that might use window scrolling)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    })
  }, [pathname])

  return null
}

