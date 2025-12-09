import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { notificationService } from '@/services/notifications'
import { Bell, X, Clock, Droplet, Dumbbell, Target } from 'lucide-react'

interface NotificationPermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnable: () => void
}

export function NotificationPermissionDialog({
  open,
  onOpenChange,
  onEnable,
}: NotificationPermissionDialogProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [open])

  const handleEnable = async () => {
    setIsRequesting(true)
    try {
      const result = await notificationService.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        onEnable()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleSkip = () => {
    onOpenChange(false)
  }

  if (permission === 'granted') {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="card-modern border-acid/30 p-6 md:p-8 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0">
              <Bell className="w-6 h-6 text-acid" />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-text font-sans">
                Stay on Track with Reminders
              </DialogTitle>
              <DialogDescription className="text-sm text-dim font-mono mt-1">
                Get notified about meals, water intake, workouts, and goal progress
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 border border-border rounded-sm bg-panel/50">
              <div className="w-8 h-8 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-acid" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text font-mono uppercase mb-1">
                  Meal Reminders
                </p>
                <p className="text-xs text-dim font-mono">
                  Never miss breakfast, lunch, or dinner. Get notified at your preferred meal times.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border border-border rounded-sm bg-panel/50">
              <div className="w-8 h-8 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0 mt-0.5">
                <Droplet className="w-4 h-4 text-acid" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text font-mono uppercase mb-1">
                  Water Intake
                </p>
                <p className="text-xs text-dim font-mono">
                  Stay hydrated with regular reminders throughout the day.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border border-border rounded-sm bg-panel/50">
              <div className="w-8 h-8 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0 mt-0.5">
                <Dumbbell className="w-4 h-4 text-acid" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text font-mono uppercase mb-1">
                  Workout Reminders
                </p>
                <p className="text-xs text-dim font-mono">
                  Get motivated with workout reminders on your preferred days and times.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border border-border rounded-sm bg-panel/50">
              <div className="w-8 h-8 rounded-sm bg-acid/20 flex items-center justify-center border border-acid/30 flex-shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-acid" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text font-mono uppercase mb-1">
                  Goal Progress
                </p>
                <p className="text-xs text-dim font-mono">
                  Daily updates on your progress toward calorie, protein, and water goals.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <button
            onClick={handleEnable}
            disabled={isRequesting || permission === 'denied'}
            className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? (
              <>
                <div className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Enable Notifications</span>
              </>
            )}
          </button>
          <button
            onClick={handleSkip}
            className="btn-secondary flex items-center justify-center gap-2 flex-1"
          >
            <X className="w-4 h-4" />
            <span>Maybe Later</span>
          </button>
        </div>

        {permission === 'denied' && (
          <div className="mt-4 p-3 border border-warning/30 bg-warning/5 rounded-sm">
            <p className="text-xs text-text font-mono">
              Notifications are blocked. Please enable them in your browser settings to receive reminders.
            </p>
          </div>
        )}

        <p className="text-xs text-center text-dim font-mono mt-4">
          You can change these settings anytime in your{' '}
          <Link
            to="/profile"
            onClick={() => onOpenChange(false)}
            className="text-acid hover:opacity-80 transition-colors underline"
          >
            Profile Settings
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}

