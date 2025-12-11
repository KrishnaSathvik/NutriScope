import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CheckCircle2, X, Target, ArrowRight } from 'lucide-react'

interface UpdateTargetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTargets: {
    calories: number
    protein: number
    water: number
  }
  newTargets: {
    calories: number
    protein: number
    water: number
  }
  onUpdate: () => Promise<void>
  onSkip: () => void
  description?: string // Optional custom description
}

export function UpdateTargetsDialog({
  open,
  onOpenChange,
  currentTargets,
  newTargets,
  onUpdate,
  onSkip,
  description,
}: UpdateTargetsDialogProps) {
  const caloriesDiff = newTargets.calories - currentTargets.calories
  const proteinDiff = newTargets.protein - currentTargets.protein
  const waterDiff = newTargets.water - currentTargets.water

  const hasChanges = caloriesDiff !== 0 || proteinDiff !== 0 || waterDiff !== 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideClose={true} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-accent-soft flex items-center justify-center border border-acid/30 flex-shrink-0">
              <Target className="w-4 h-4 md:w-5 md:h-5 text-accent" />
            </div>
            <DialogTitle className="text-xl md:text-2xl font-bold text-text font-mono">
              Update Your Targets?
            </DialogTitle>
          </div>
          <DialogDescription className="text-dim font-mono text-sm">
            {description || "We've recalculated your personalized targets based on your sex. Would you like to update them?"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {/* Calories */}
            <div className="p-4 border border-border rounded-sm bg-panel/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim">Calories</span>
                {hasChanges && caloriesDiff !== 0 && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    caloriesDiff > 0 
                      ? 'text-success bg-success/10' 
                      : 'text-orange-500 bg-orange-500/10'
                  }`}>
                    {caloriesDiff > 0 ? '+' : ''}{caloriesDiff} cal
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider mb-1">Current</div>
                  <div className="text-base md:text-lg font-bold text-text font-mono">
                    {currentTargets.calories} cal/day
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-dim flex-shrink-0" />
                <div className="flex-1 text-right">
                  <div className="text-[10px] md:text-xs text-accent font-mono uppercase tracking-wider mb-1">New</div>
                  <div className="text-base md:text-lg font-bold text-accent font-mono">
                    {newTargets.calories} cal/day
                  </div>
                </div>
              </div>
            </div>

            {/* Protein */}
            <div className="p-4 border border-border rounded-sm bg-panel/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim">Protein</span>
                {hasChanges && proteinDiff !== 0 && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    proteinDiff > 0 
                      ? 'text-success bg-success/10' 
                      : 'text-orange-500 bg-orange-500/10'
                  }`}>
                    {proteinDiff > 0 ? '+' : ''}{proteinDiff}g
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider mb-1">Current</div>
                  <div className="text-base md:text-lg font-bold text-text font-mono">
                    {currentTargets.protein}g/day
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-dim flex-shrink-0" />
                <div className="flex-1 text-right">
                  <div className="text-[10px] md:text-xs text-accent font-mono uppercase tracking-wider mb-1">New</div>
                  <div className="text-base md:text-lg font-bold text-accent font-mono">
                    {newTargets.protein}g/day
                  </div>
                </div>
              </div>
            </div>

            {/* Water */}
            <div className="p-4 border border-border rounded-sm bg-panel/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim">Water</span>
                {hasChanges && waterDiff !== 0 && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    waterDiff > 0 
                      ? 'text-success bg-success/10' 
                      : 'text-orange-500 bg-orange-500/10'
                  }`}>
                    {waterDiff > 0 ? '+' : ''}{waterDiff}ml
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider mb-1">Current</div>
                  <div className="text-base md:text-lg font-bold text-text font-mono">
                    {currentTargets.water}ml/day
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-dim flex-shrink-0" />
                <div className="flex-1 text-right">
                  <div className="text-[10px] md:text-xs text-accent font-mono uppercase tracking-wider mb-1">New</div>
                  <div className="text-base md:text-lg font-bold text-accent font-mono">
                    {newTargets.water}ml/day
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onSkip}
              className="btn-secondary flex-1 gap-2 text-xs md:text-sm"
            >
              <X className="w-4 h-4" />
              <span>Keep Current</span>
            </button>
            <button
              type="button"
              onClick={onUpdate}
              className="btn-primary flex-1 gap-2 text-xs md:text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Update</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

