import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createWeightLog, getLatestWeight } from '@/services/weightTracking'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Weight, Plus, Minus, Check, X, Edit } from 'lucide-react'

export function QuickWeightEntry() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [weight, setWeight] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get latest weight for quick reference
  const { data: latestWeight, refetch: refetchLatestWeight } = useQuery({
    queryKey: ['latestWeight'],
    queryFn: getLatestWeight,
    refetchOnWindowFocus: true,
  })

  // Get today's date string for comparison
  const today = format(new Date(), 'yyyy-MM-dd')
  
  // Check if weight already logged today
  // Handle both string dates (from DB) and Date objects
  // Supabase DATE type comes as string 'YYYY-MM-DD' or ISO datetime 'YYYY-MM-DDTHH:mm:ss'
  const latestWeightDate = latestWeight?.date 
    ? (typeof latestWeight.date === 'string' 
        ? latestWeight.date.split('T')[0] // Extract date part from ISO datetime if present
        : format(new Date(latestWeight.date), 'yyyy-MM-dd'))
    : null
  const todayLogged = latestWeight && latestWeightDate === today

  // Debug logging to help troubleshoot
  useEffect(() => {
    if (latestWeight) {
      console.log('[QuickWeightEntry] Latest weight:', latestWeight)
      console.log('[QuickWeightEntry] Latest weight date:', latestWeightDate)
      console.log('[QuickWeightEntry] Today:', today)
      console.log('[QuickWeightEntry] Today logged?', todayLogged)
    }
  }, [latestWeight, latestWeightDate, today, todayLogged])

  // Pre-fill weight when opening edit form for today's weight
  const handleEditClick = () => {
    if (todayLogged && latestWeight) {
      setWeight(latestWeight.weight.toString())
    }
    setIsOpen(true)
  }

  const weightMutation = useMutation({
    mutationFn: createWeightLog,
    onSuccess: async () => {
      // Invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['weightLogs'] }),
        queryClient.invalidateQueries({ queryKey: ['latestWeight'] }),
        queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
      ])
      // Explicitly refetch latest weight to ensure UI updates
      await refetchLatestWeight()
      setIsOpen(false)
      setWeight('')
      toast({
        title: 'Weight logged!',
        description: 'Your weight has been recorded.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log weight',
        variant: 'destructive',
      })
    },
  })

  const handleQuickLog = (adjustment: number) => {
    if (!latestWeight) return
    const newWeight = latestWeight.weight + adjustment
    handleSubmit(newWeight.toString())
  }

  const handleSubmit = (weightValue?: string) => {
    const weightToLog = weightValue || weight
    if (!weightToLog || parseFloat(weightToLog) <= 0) {
      toast({
        title: 'Invalid weight',
        description: 'Please enter a valid weight',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    weightMutation.mutate({
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: parseFloat(weightToLog),
    })
    setTimeout(() => setIsSubmitting(false), 500)
  }

  if (todayLogged && !isOpen) {
    return (
      <div className="card-modern p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
              <Weight className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Today's Weight</div>
              <div className="text-base md:text-lg font-bold text-text font-mono">
                {latestWeight.weight.toFixed(1)}kg
              </div>
            </div>
          </div>
          <button
            onClick={handleEditClick}
            className="text-dim hover:text-acid transition-colors p-1.5 md:p-2"
            title="Edit weight"
            aria-label="Edit today's weight"
          >
            <Edit className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="card-modern p-3 md:p-4 cursor-pointer transition-colors" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
              <Weight className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Log Weight Today</div>
              <div className="text-xs md:text-sm text-dim font-mono">
                {latestWeight ? `Last: ${latestWeight.weight.toFixed(1)}kg` : 'Click to log weight'}
              </div>
            </div>
          </div>
          <Plus className="w-4 h-4 md:w-5 md:h-5 text-acid" />
        </div>
      </div>
    )
  }

  return (
    <div className="card-modern p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
            <Weight className="w-5 h-5 md:w-6 md:h-6 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
          </div>
          <div>
            <div className="text-xs md:text-sm text-dim font-mono uppercase tracking-wider">
              {todayLogged ? 'Edit Weight' : 'Log Weight'}
            </div>
            <div className="text-sm md:text-base text-dim font-mono">Today, {format(new Date(), 'MMM d')}</div>
          </div>
        </div>
        <button
          onClick={() => {
            setIsOpen(false)
            setWeight('')
          }}
          className="text-dim hover:text-text transition-colors p-1.5 md:p-2"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      <div className="space-y-4 md:space-y-5">
        {/* Quick Adjustments */}
        {latestWeight && (
          <div className="space-y-2">
            <span className="text-xs md:text-sm text-dim font-mono block">Quick adjust:</span>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleQuickLog(-0.5)}
                disabled={isSubmitting}
                className="btn-secondary text-xs md:text-sm px-2 md:px-3 py-2.5 md:py-3 gap-1.5 flex flex-col items-center justify-center"
              >
                <Minus className="w-4 h-4 md:w-5 md:h-5" />
                <span>0.5kg</span>
              </button>
              <button
                onClick={() => handleQuickLog(-0.1)}
                disabled={isSubmitting}
                className="btn-secondary text-xs md:text-sm px-2 md:px-3 py-2.5 md:py-3 gap-1.5 flex flex-col items-center justify-center"
              >
                <Minus className="w-4 h-4 md:w-5 md:h-5" />
                <span>0.1kg</span>
              </button>
              <button
                onClick={() => handleQuickLog(0.1)}
                disabled={isSubmitting}
                className="btn-secondary text-xs md:text-sm px-2 md:px-3 py-2.5 md:py-3 gap-1.5 flex flex-col items-center justify-center"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span>0.1kg</span>
              </button>
              <button
                onClick={() => handleQuickLog(0.5)}
                disabled={isSubmitting}
                className="btn-secondary text-xs md:text-sm px-2 md:px-3 py-2.5 md:py-3 gap-1.5 flex flex-col items-center justify-center"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span>0.5kg</span>
              </button>
            </div>
          </div>
        )}

        {/* Manual Entry */}
        <div className="space-y-3">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit()
              }
            }}
            step="0.1"
            min="1"
            max="500"
            className="input-modern text-lg md:text-xl text-center font-mono font-bold w-full py-3 md:py-4"
            placeholder={latestWeight ? latestWeight.weight.toFixed(1) : "e.g., 70.5"}
            autoFocus
          />
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !weight}
            className="btn-primary w-full gap-2 text-sm md:text-base py-3 md:py-4"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-text border-t-transparent rounded-full animate-spin" />
                <span>{todayLogged ? 'Updating...' : 'Logging...'}</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 md:w-6 md:h-6" />
                <span>{todayLogged ? 'Update Weight' : 'Log Weight'}</span>
              </>
            )}
          </button>
        </div>

        {/* Same as Yesterday */}
        {latestWeight && format(new Date(latestWeight.date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
          <button
            onClick={() => handleSubmit(latestWeight.weight.toString())}
            disabled={isSubmitting}
            className="btn-secondary w-full text-xs md:text-sm py-2.5 md:py-3"
          >
            Same as yesterday ({latestWeight.weight.toFixed(1)}kg)
          </button>
        )}
      </div>
    </div>
  )
}

