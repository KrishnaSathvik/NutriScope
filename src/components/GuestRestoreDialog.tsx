import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface GuestRestoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: () => Promise<void>
  onDismiss: () => void
}

export function GuestRestoreDialog({
  open,
  onOpenChange,
  onDismiss,
}: GuestRestoreDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-mono uppercase tracking-wider">
            Restore Guest Data?
          </DialogTitle>
          <DialogDescription className="text-sm text-dim font-mono mt-2">
            We detected you had guest data from a previous session. Due to security policies, we may not be able to restore it automatically. Your best option is to create an account to permanently migrate your data.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="p-4 border border-border bg-panel rounded-sm">
            <p className="text-xs text-dim font-mono">
              <strong className="text-text">Important:</strong> When you sign out and sign back in as a guest, you get a new anonymous account. Your old guest data is still stored securely in Supabase, but due to security policies (RLS), the new guest account cannot access the old guest account's data.
            </p>
          </div>
          <div className="p-4 border border-acid/30 bg-acid/10 rounded-sm">
            <p className="text-xs text-acid font-mono">
              <strong className="text-acid">💡 Best Solution:</strong> Create an account while signed in as your current guest to migrate all data permanently. Or start fresh with this new guest session.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
          <Button
            onClick={() => {
              window.location.href = '/auth'
            }}
            className="w-full sm:w-auto btn-primary"
          >
            Create Account to Migrate
          </Button>
          <Button
            onClick={() => {
              onDismiss()
              onOpenChange(false)
            }}
            className="w-full sm:w-auto btn-secondary"
          >
            <X className="w-4 h-4 mr-2" />
            Start Fresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

