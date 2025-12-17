import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Bell, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

export default function NotificationsPage() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [permission, setPermission] = useState<NotificationPermission>('default')

  // Load notifications from storage
  useEffect(() => {
    const stored = getStoredNotifications()
    setNotifications(stored.sort((a, b) => b.timestamp - a.timestamp))
    
    // Get actual notification permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
    
    // Also check for any notifications that might have been shown but not saved
    // This can happen if BroadcastChannel/postMessage failed but notification was shown
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Request service worker to resend any recent notifications
      navigator.serviceWorker.controller.postMessage({
        type: 'RESEND_RECENT_NOTIFICATIONS'
      })
    }
  }, [])

  // Listen for new notifications from service worker and BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Track recent notifications to prevent duplicates
    const recentNotificationIds = new Set<string>()
    const DEDUP_WINDOW_MS = 10000 // 10 seconds deduplication window

    const handleNotification = (data: any) => {
      if (data && data.type === 'NOTIFICATION_SHOWN') {
        console.log('[NotificationsPage] Received NOTIFICATION_SHOWN message:', data)
        
        // Create a unique ID for deduplication using tag + timestamp
        const notificationId = data.tag 
          ? `${data.tag}-${data.timestamp || Date.now()}`
          : `${data.title}-${data.timestamp || Date.now()}`
        
        // Check if we've already processed this notification
        if (recentNotificationIds.has(notificationId)) {
          console.log('[NotificationsPage] ⏭️ Skipping duplicate notification:', notificationId)
          return
        }
        
        // Mark as processed
        recentNotificationIds.add(notificationId)
        
        // Clean up old IDs after deduplication window
        setTimeout(() => {
          recentNotificationIds.delete(notificationId)
        }, DEDUP_WINDOW_MS)
        
        const newNotification: StoredNotification = {
          id: notificationId,
          type: data.notificationType || 'goal',
          title: data.title || 'Reminder',
          message: data.body || '',
          timestamp: data.timestamp || Date.now(),
          read: false,
          actionUrl: data.url,
        }
        
        // Use functional update to avoid dependency on notifications
        setNotifications((prevNotifications) => {
          // Check if notification with same ID already exists
          const exists = prevNotifications.some(n => n.id === notificationId)
          if (exists) {
            console.log('[NotificationsPage] ⏭️ Notification already exists in list:', notificationId)
            return prevNotifications
          }
          
          const updated = [newNotification, ...prevNotifications]
          saveNotifications(updated)
          return updated
        })
      }
    }

    // Use BroadcastChannel as primary method (works across all contexts)
    let broadcastChannel: BroadcastChannel | null = null
    try {
      broadcastChannel = new BroadcastChannel('nutriscope-notifications')
      broadcastChannel.onmessage = (event) => {
        console.log('[NotificationsPage] 📨 Received BroadcastChannel message:', event.data)
        console.log('[NotificationsPage] Message type:', event.data?.type)
        if (event.data && event.data.type === 'NOTIFICATION_SHOWN') {
          console.log('[NotificationsPage] ✅ Processing NOTIFICATION_SHOWN message')
          handleNotification(event.data)
        } else {
          console.log('[NotificationsPage] ⚠️ Ignoring message - wrong type:', event.data?.type)
        }
      }
      console.log('[NotificationsPage] ✅ BroadcastChannel listener registered')
    } catch (error) {
      console.warn('[NotificationsPage] ⚠️ BroadcastChannel not available:', error)
    }

    // Fallback: Service Worker messages (works when SW controls the page)
    // Also listen for storage save messages
    let handleMessage: ((event: MessageEvent) => void) | null = null
    if ('serviceWorker' in navigator) {
      handleMessage = (event: MessageEvent) => {
        console.log('[NotificationsPage] 📨 Received Service Worker message:', event.data)
        // Handle notification shown messages
        if (event.data && event.data.type === 'NOTIFICATION_SHOWN') {
          console.log('[NotificationsPage] ✅ Processing NOTIFICATION_SHOWN from SW')
          handleNotification(event.data)
        }
        // Handle storage save messages (fallback)
        if (event.data && event.data.type === 'SAVE_NOTIFICATION_TO_STORAGE') {
          console.log('[NotificationsPage] ✅ Processing SAVE_NOTIFICATION_TO_STORAGE from SW')
          handleNotification(event.data.notification)
        }
      }
      navigator.serviceWorker.addEventListener('message', handleMessage)
      console.log('[NotificationsPage] Service Worker message listener registered')
    }
    
    // Combined cleanup function
    return () => {
      if (handleMessage && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
        console.log('[NotificationsPage] Service Worker message listener removed')
      }
      if (broadcastChannel) {
        broadcastChannel.close()
        console.log('[NotificationsPage] BroadcastChannel listener removed')
      }
    }
  }, []) // Empty dependency array - listener stays active

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
    toast({
      title: 'All notifications marked as read',
    })
  }

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id)
    setNotifications(updated)
    saveNotifications(updated)
    toast({
      title: 'Notification deleted',
    })
  }

  const clearAll = () => {
    setNotifications([])
    saveNotifications([])
    toast({
      title: 'All notifications cleared',
    })
  }

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications

  const unreadCount = notifications.filter((n) => !n.read).length

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

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-4 md:pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-[2px] w-6 md:w-8 bg-acid"></div>
            <div className="h-[2px] w-3 md:w-4 bg-acid/50"></div>
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest ml-1">
              NOTIFICATIONS
            </span>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-acid font-mono hover:opacity-80 transition-opacity"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-dim font-mono hover:text-text transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text tracking-tight mt-2 md:mt-4">
          Notifications
        </h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition-colors ${
            filter === 'all'
              ? 'text-acid border-b-2 border-acid'
              : 'text-dim hover:text-text'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition-colors relative ${
            filter === 'unread'
              ? 'text-acid border-b-2 border-acid'
              : 'text-dim hover:text-text'
          }`}
        >
          Unread ({unreadCount})
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-acid rounded-full"></span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="card-modern p-8 md:p-12 text-center">
          <Bell className="w-12 h-12 md:w-16 md:h-16 text-dim mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-bold text-text font-mono mb-2">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          </h3>
          <p className="text-sm md:text-base text-dim font-mono">
            {filter === 'unread'
              ? 'All caught up! 🎉'
              : 'You\'ll see reminders and updates here when they arrive.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`card-modern p-4 md:p-6 transition-all ${
                !notification.read ? 'border-acid/50 bg-acid/5' : ''
              }`}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="text-2xl md:text-3xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm md:text-base font-bold text-text font-mono">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-dim hover:text-acid transition-colors p-1"
                          title="Mark as read"
                        >
                          <Circle className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      )}
                      {notification.read && (
                        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-dim hover:text-destructive transition-colors p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-dim font-mono mb-2 leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-xs text-dim font-mono">
                      {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
                    </span>
                    {notification.actionUrl && (
                      <a
                        href={notification.actionUrl}
                        className="text-xs text-acid font-mono hover:opacity-80 transition-opacity"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification Permission Status */}
      {typeof window !== 'undefined' && 'Notification' in window && (
        <div className="card-modern p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm md:text-base font-bold text-text font-mono mb-1">
                Notification Status
              </h3>
              <p className="text-xs md:text-sm text-dim font-mono">
                Permission: <span className="text-text font-bold capitalize">{permission}</span>
              </p>
            </div>
            {permission !== 'granted' && (
              <button
                onClick={async () => {
                  const newPermission = await Notification.requestPermission()
                  setPermission(newPermission)
                  toast({
                    title: newPermission === 'granted' ? 'Notifications enabled!' : 'Permission denied',
                    description:
                      newPermission === 'granted'
                        ? 'You\'ll receive reminders and updates.'
                        : 'Please enable notifications in your browser settings.',
                  })
                }}
                className="btn-primary text-xs"
              >
                Enable
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

