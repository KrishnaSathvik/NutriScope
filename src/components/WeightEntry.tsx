import { useState } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, Scale, Calendar, FileText } from 'lucide-react'
import { WeightEntry as WeightEntryType } from '@/services/weightTracking'

interface WeightEntryProps {
  open: boolean
  onClose: () => void
  onSubmit: (entry: WeightEntryType) => void
  initialWeight?: number
  initialDate?: string
}

export function WeightEntry({ 
  open, 
  onClose, 
  onSubmit,
  initialWeight,
  initialDate 
}: WeightEntryProps) {
  const [weight, setWeight] = useState<string>(initialWeight?.toString() || '')
  const [date, setDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'))
  const [bodyFat, setBodyFat] = useState<string>('')
  const [muscleMass, setMuscleMass] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!weight || parseFloat(weight) <= 0) {
      return
    }

    onSubmit({
      date,
      weight: parseFloat(weight),
      body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
      muscle_mass: muscleMass ? parseFloat(muscleMass) : undefined,
      notes: notes || undefined,
    })

    // Reset form
    setWeight('')
    setBodyFat('')
    setMuscleMass('')
    setNotes('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-text font-sans flex items-center gap-2">
            <Scale className="w-5 h-5 text-acid" />
            Log Weight
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Date */}
          <div>
            <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="input-modern text-sm md:text-base w-full"
              required
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
              <Scale className="w-3 h-3 flex-shrink-0" />
              Weight (kg) *
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="0.1"
              min="1"
              max="500"
              className="input-modern text-sm md:text-base w-full"
              placeholder="e.g., 70.5"
              required
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                Body Fat (%)
              </label>
              <input
                type="number"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="input-modern text-sm md:text-base w-full"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                Muscle Mass (kg)
              </label>
              <input
                type="number"
                value={muscleMass}
                onChange={(e) => setMuscleMass(e.target.value)}
                step="0.1"
                min="0"
                max="200"
                className="input-modern text-sm md:text-base w-full"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2 flex items-center gap-1.5 md:gap-2">
              <FileText className="w-3 h-3 flex-shrink-0" />
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input-modern text-sm md:text-base w-full resize-none"
              placeholder="Add any notes about this measurement..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4 pt-2">
            <button
              type="submit"
              className="btn-primary flex-1 text-sm md:text-base py-2.5 md:py-3"
            >
              Log Weight
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm md:text-base py-2.5 md:py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

