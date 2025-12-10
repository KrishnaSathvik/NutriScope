import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CheckCircle2, UserCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GenderSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenderSelected: (gender: 'male' | 'female') => Promise<void>
}

export function GenderSelectionDialog({
  open,
  onOpenChange,
  onGenderSelected,
}: GenderSelectionDialogProps) {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!selectedGender) {
      toast({
        title: "Please select",
        description: "Please select your sex to continue.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await onGenderSelected(selectedGender)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save gender. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Allow closing only if user has selected a gender (after save)
    // Otherwise, prevent closing to ensure gender is set
    if (selectedGender && !isSubmitting) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" hideClose={true} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text font-mono">
            Add Your Sex
          </DialogTitle>
          <DialogDescription className="text-dim font-mono">
            We need your sex to calculate accurate BMR and personalized calorie targets. This can only be set once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ].map((option) => {
              const isSelected = selectedGender === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedGender(option.value as 'male' | 'female')}
                  disabled={isSubmitting}
                  className={`relative rounded-sm p-4 border-2 transition-all font-mono text-center ${
                    isSelected
                      ? "bg-accent-soft/50 ring-2"
                      : "border-border bg-surface hover:border-dim"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: "#0D9488",
                          boxShadow: "0 0 0 2px rgba(13, 148, 136, 0.2)",
                        }
                      : {}
                  }
                >
                  <div className="flex flex-col items-center gap-2">
                    <UserCircle className={`w-8 h-8 ${isSelected ? 'text-accent' : 'text-dim'}`} />
                    <span
                      className="text-sm block font-medium"
                      style={{ color: isSelected ? "#111827" : "#6B7280" }}
                    >
                      {option.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                      style={{ backgroundColor: "#0D9488" }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedGender || isSubmitting}
              className="btn-primary flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-text border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

