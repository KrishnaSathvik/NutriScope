import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserCircle, UserPlus } from 'lucide-react'

interface GuestDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinueAsGuest: () => void
  onCreateAccount: () => void
}

export function GuestDataDialog({
  open,
  onOpenChange,
  onContinueAsGuest,
  onCreateAccount,
}: GuestDataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-mono uppercase tracking-wider">
            Guest Account Detected
          </DialogTitle>
          <DialogDescription className="text-sm text-dim font-mono mt-2">
            We detected you had a guest account. Your guest data is stored securely. Choose how you'd like to proceed:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <button
            onClick={() => {
              onCreateAccount()
              onOpenChange(false)
            }}
            className="w-full flex items-center gap-3 p-4 border border-border bg-surface hover:bg-panel hover:border-acid/50 transition-all rounded-sm text-left group"
          >
            <div className="w-10 h-10 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center flex-shrink-0 group-hover:bg-acid/30">
              <UserPlus className="w-5 h-5 text-acid" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-text font-mono uppercase tracking-wider">
                Create Account
              </div>
              <div className="text-xs text-dim font-mono mt-1">
                Create an account and migrate your guest data permanently
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onContinueAsGuest()
              onOpenChange(false)
            }}
            className="w-full flex items-center gap-3 p-4 border border-border bg-surface hover:bg-panel hover:border-acid/50 transition-all rounded-sm text-left group"
          >
            <div className="w-10 h-10 rounded-sm bg-acid/20 border border-acid/30 flex items-center justify-center flex-shrink-0 group-hover:bg-acid/30">
              <UserCircle className="w-5 h-5 text-acid" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-text font-mono uppercase tracking-wider">
                Continue as Guest
              </div>
              <div className="text-xs text-dim font-mono mt-1">
                Start fresh with a new guest session (your old guest data will remain but won't be accessible)
              </div>
            </div>
          </button>
        </div>

        <DialogFooter className="mt-4">
          <p className="text-xs text-dim font-mono text-center w-full">
            Note: Guest data is stored securely in Supabase. Creating an account will migrate all your data permanently. If you continue as guest, you'll start fresh but your old data remains stored.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

