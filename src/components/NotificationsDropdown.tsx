import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Bell, X, CheckCircle2, Circle, Trash2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface StoredNotification {
  id: string
  type: 'meal' | 'water' | 'workout' | 'goal' | 'streak' | 'weight' | 'summary'
  title: string
  message: string
  timestamp: number
  read: boolean
  actionUrl?: string
}

const NOTIFICATIONS_STORAGE_KEY = 'nutriscope_notifications'

function getStoredNotifications(): StoredNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveNotifications(notifications: StoredNotification[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
  } catch (error) {
    console.error('Error saving notifications:', error)
  }
}

export function NotificationsDropdown() {
  const { user, isGuest } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load notifications from storage
  useEffect(() => {
    const stored = getStoredNotifications()
    setNotifications(stored.sort((a, b) => b.timestamp - a.timestamp))
  }, [])

  // Listen for new notifications from service worker and BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Track recent notifications to prevent duplicates
    const recentNotificationIds = new Set<string>()
    const DEDUP_WINDOW_MS = 10000 // 10 seconds deduplication window

    const handleNotification = (data: any) => {
      if (data && data.type === 'NOTIFICATION_SHOWN') {
        console.log('[NotificationsDropdown] Received NOTIFICATION_SHOWN message:', data)
        
        // Create a unique ID for deduplication using tag + timestamp (same as NotificationsPage)
        const messageTimestamp = data.timestamp || Date.now()
        const notificationId = data.tag 
          ? `${data.tag}-${messageTimestamp}`
          : `${data.title}-${messageTimestamp}`
        
        console.log('[NotificationsDropdown] Generated notification ID:', notificationId)
        console.log('[NotificationsDropdown] Recent notification IDs:', Array.from(recentNotificationIds))
        
        // Check if we've already processed this notification
        if (recentNotificationIds.has(notificationId)) {
          console.log('[NotificationsDropdown] ⏭️ Skipping duplicate notification:', notificationId)
          return
        }
        
        // Mark as processed immediately
        recentNotificationIds.add(notificationId)
        console.log('[NotificationsDropdown] ✅ Added notification ID to deduplication set:', notificationId)
        
        // Clean up old IDs after deduplication window
        setTimeout(() => {
          recentNotificationIds.delete(notificationId)
        }, DEDUP_WINDOW_MS)
        
        const newNotification: StoredNotification = {
          id: notificationId, // Use the same ID for consistency
          type: data.notificationType || 'goal',
          title: data.title || 'Reminder',
          message: data.body || '',
          timestamp: messageTimestamp, // Use timestamp from message
          read: false,
          actionUrl: data.url,
        }
        
        // Use functional update to avoid dependency on notifications
        setNotifications((prevNotifications) => {
          // Check if notification with same ID already exists
          const exists = prevNotifications.some(n => n.id === notificationId)
          if (exists) {
            console.log('[NotificationsDropdown] ⏭️ Notification already exists in list:', notificationId)
            return prevNotifications
          }
          
          const updated = [newNotification, ...prevNotifications]
          saveNotifications(updated)
          return updated
        })
        
        // Trigger pulse animation for new notification
        setHasNewNotification(true)
        setTimeout(() => setHasNewNotification(false), 2000) // Stop pulsing after 2 seconds
      }
    }

    // Method 1: BroadcastChannel (works across all contexts - primary method)
    let broadcastChannel: BroadcastChannel | null = null
    try {
      broadcastChannel = new BroadcastChannel('nutriscope-notifications')
      broadcastChannel.onmessage = (event) => {
        console.log('[NotificationsDropdown] Received BroadcastChannel message:', event.data)
        handleNotification(event.data)
      }
      console.log('[NotificationsDropdown] BroadcastChannel listener registered')
    } catch (error) {
      console.warn('[NotificationsDropdown] BroadcastChannel not available:', error)
    }

    // Method 2: Service Worker messages (works when SW controls the page)
    let handleMessage: ((event: MessageEvent) => void) | null = null
    if ('serviceWorker' in navigator) {
      handleMessage = (event: MessageEvent) => {
        // Handle notification shown messages
        if (event.data && event.data.type === 'NOTIFICATION_SHOWN') {
          handleNotification(event.data)
        }
        // Handle storage save messages (fallback)
        if (event.data && event.data.type === 'SAVE_NOTIFICATION_TO_STORAGE') {
          handleNotification(event.data.notification)
        }
      }
      navigator.serviceWorker.addEventListener('message', handleMessage)
      console.log('[NotificationsDropdown] Service Worker message listener registered')
    }
    
    // Combined cleanup function
    return () => {
      if (handleMessage && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
        console.log('[NotificationsDropdown] Service Worker message listener removed')
      }
      if (broadcastChannel) {
        broadcastChannel.close()
        console.log('[NotificationsDropdown] BroadcastChannel listener removed')
      }
    }
  }, []) // Empty dependency array - listener stays active

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !n.read).length
  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 10) // Show max 10 unread
  const recentNotifications = notifications.slice(0, 10) // Show max 10 recent

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
    setNotifications(updated)
    saveNotifications(updated)
  }

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }))
    setNotifications(updated)
    saveNotifications(updated)
  }

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id)
    setNotifications(updated)
    saveNotifications(updated)
  }

  const getNotificationIcon = (type: StoredNotification['type']) => {
    switch (type) {
      case 'meal':
        return '🍽️'
      case 'water':
        return '💧'
      case 'workout':
        return '💪'
      case 'goal':
        return '🎯'
      case 'streak':
        return '🔥'
      case 'weight':
        return '⚖️'
      case 'summary':
        return '📊'
      default:
        return '🔔'
    }
  }

  // Don't show if no user/guest (safety check, though Header already handles this)
  if (!user && !isGuest) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          // Mark all as read when opening dropdown
          if (!isOpen && unreadCount > 0) {
            const updated = notifications.map((n) => ({ ...n, read: true }))
            setNotifications(updated)
            saveNotifications(updated)
          }
        }}
        className="relative p-2 text-dim hover:text-text transition-colors rounded-sm hover:bg-panel/50 flex items-center justify-center"
        aria-label="Notifications"
        title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className={`w-5 h-5 md:w-6 md:h-6 transition-all ${hasNewNotification ? 'animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-acid text-text text-[10px] md:text-xs font-bold font-mono rounded-full flex items-center justify-center border-2 border-surface min-w-[1rem] md:min-w-[1.25rem] ${hasNewNotification ? 'animate-pulse scale-110' : ''}`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* Red dot indicator for unread (always visible when there are unread) */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-acid rounded-full animate-pulse" aria-hidden="true" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed md:absolute right-4 md:right-0 top-16 md:top-full mt-2 w-[calc(100vw-2rem)] md:w-80 lg:w-96 bg-surface border border-border rounded-sm shadow-xl z-[9999] max-h-[600px] flex flex-col" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
            <h3 className="text-sm md:text-base font-bold text-text font-mono uppercase tracking-wider">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-acid font-mono hover:opacity-80 transition-opacity"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-dim hover:text-text transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 md:p-8 text-center">
                <Bell className="w-8 h-8 md:w-10 md:h-10 text-dim/30 mx-auto mb-3" />
                <p className="text-xs md:text-sm text-dim font-mono">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(unreadCount > 0 ? unreadNotifications : recentNotifications).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 md:p-4 hover:bg-panel/50 transition-colors relative ${
                      !notification.read ? 'bg-acid/5 border-l-2 border-l-acid' : ''
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!notification.read && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-acid rounded-full animate-pulse" aria-label="Unread" />
                    )}
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="text-lg md:text-xl flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-xs md:text-sm font-bold text-text font-mono leading-tight">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-dim hover:text-acid transition-colors p-0.5"
                                title="Mark as read"
                              >
                                <Circle className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-dim hover:text-destructive transition-colors p-0.5"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] md:text-xs text-dim font-mono mb-2 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] md:text-[10px] text-dim font-mono">
                            {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
                          </span>
                          {notification.actionUrl && (
                            <Link
                              to={notification.actionUrl}
                              onClick={() => setIsOpen(false)}
                              className="text-[9px] md:text-[10px] text-acid font-mono hover:opacity-80 transition-opacity flex items-center gap-1"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border p-3">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs text-acid font-mono hover:opacity-80 transition-opacity"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

