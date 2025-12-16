import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createWeightLog, getLatestWeight } from '@/services/weightTracking'
import { useToast } from '@/hooks/use-toast'
import { Weight, Plus, Minus, Check, X, Edit } from 'lucide-react'

export function QuickWeightEntry() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [weight, setWeight] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // Get latest weight for quick reference
  const { data: latestWeight } = useQuery({
    queryKey: ['latestWeight'],
    queryFn: getLatestWeight,
    refetchOnWindowFocus: true,
  })

  // Get today's date string for comparison
  const today = format(new Date(), 'yyyy-MM-dd')
  
  // Check if weight already logged for selected date
  // Handle both string dates (from DB) and Date objects
  // Supabase DATE type comes as string 'YYYY-MM-DD' or ISO datetime 'YYYY-MM-DDTHH:mm:ss'
  const latestWeightDate = latestWeight?.date 
    ? (typeof latestWeight.date === 'string' 
        ? latestWeight.date.split('T')[0] // Extract date part from ISO datetime if present
        : format(new Date(latestWeight.date), 'yyyy-MM-dd'))
    : null
  const selectedDateLogged = latestWeight && latestWeightDate === selectedDate
  const isToday = selectedDate === today

  // Debug logging to help troubleshoot
  useEffect(() => {
    if (latestWeight) {
      console.log('[QuickWeightEntry] Latest weight:', latestWeight)
      console.log('[QuickWeightEntry] Latest weight date:', latestWeightDate)
      console.log('[QuickWeightEntry] Today:', today)
      console.log('[QuickWeightEntry] Selected date logged?', selectedDateLogged)
    }
  }, [latestWeight, latestWeightDate, today, selectedDateLogged])

  // Pre-fill weight when opening edit form
  const handleEditClick = () => {
    if (selectedDateLogged && latestWeight) {
      setWeight(latestWeight.weight.toString())
    } else {
      setWeight('') // Clear weight for new entries
    }
    setIsOpen(true)
  }

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
      // Only pre-fill weight if editing today's existing entry
      if (!selectedDateLogged || !latestWeight) {
        setWeight('')
      }
    }
  }, [isOpen, selectedDateLogged, latestWeight])

  const weightMutation = useMutation({
    mutationFn: createWeightLog,
    onMutate: async (newWeight) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['latestWeight'] })
      
      // Snapshot previous value
      const previousWeight = queryClient.getQueryData(['latestWeight'])
      
      // Optimistically update the cache immediately
      const optimisticWeight = {
        id: `temp-${Date.now()}`,
        user_id: '',
        date: newWeight.date,
        weight: newWeight.weight,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      queryClient.setQueryData(['latestWeight'], optimisticWeight)
      
      // Also invalidate related queries to trigger updates
      queryClient.invalidateQueries({ queryKey: ['weightLogs'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      
      // Close form immediately
      setIsOpen(false)
      setWeight('')
      
      return { previousWeight }
    },
    onSuccess: async () => {
      // Refetch to get the actual data from server
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['weightLogs'] }),
        queryClient.invalidateQueries({ queryKey: ['latestWeight'] }),
        queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
      ])
      toast({
        title: 'Weight logged!',
        description: 'Your weight has been recorded.',
      })
    },
    onError: (error, _newWeight, context) => {
      // Rollback optimistic update on error
      if (context?.previousWeight) {
        queryClient.setQueryData(['latestWeight'], context.previousWeight)
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log weight',
        variant: 'destructive',
      })
      setIsOpen(true) // Reopen form on error
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
      date: selectedDate,
      weight: parseFloat(weightToLog),
    })
    setTimeout(() => setIsSubmitting(false), 500)
  }

  if (selectedDateLogged && !isOpen && isToday) {
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
                {selectedDateLogged ? 'Edit Weight' : 'Log Weight'}
              </div>
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
        {/* Date Selector */}
        <div className="space-y-2">
          <label className="text-xs md:text-sm text-dim font-mono block">Date</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="input-modern text-sm md:text-base font-mono flex-1"
            />
            <button
              onClick={() => setSelectedDate(today)}
              className="btn-secondary text-xs px-2 md:px-3 py-2"
              title="Today"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
              className="btn-secondary text-xs px-2 md:px-3 py-2"
              title="Yesterday"
            >
              Yesterday
            </button>
          </div>
        </div>

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
            placeholder="Enter weight"
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
                <span>{selectedDateLogged ? 'Updating...' : 'Logging...'}</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 md:w-6 md:h-6" />
                <span>{selectedDateLogged ? 'Update Weight' : 'Log Weight'}</span>
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

