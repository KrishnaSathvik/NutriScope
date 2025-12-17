import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSleepLog, updateSleepLog, getSleepLog, deleteSleepLog, calculateSleepDuration } from '@/services/sleep'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Moon, Plus, X, Trash2, Check, Clock, Star } from 'lucide-react'
import { SleepLog } from '@/types'
import { decimalHoursToHoursMinutes, hoursMinutesToDecimalHours, formatSleepDuration } from '@/utils/format'

export function QuickSleepEntry() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  // Default to yesterday's date since sleep is logged the morning after
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState<string>(yesterday)
  const [bedtime, setBedtime] = useState<string>('')
  const [wakeTime, setWakeTime] = useState<string>('')
  const [sleepHours, setSleepHours] = useState<number>(7)
  const [sleepMinutes, setSleepMinutes] = useState<number>(0)
  const [sleepQuality, setSleepQuality] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const isToday = selectedDate === today
  const isYesterday = selectedDate === yesterday

  // Get sleep log for selected date
  const { data: sleepLog, refetch } = useQuery({
    queryKey: ['sleepLog', selectedDate],
    queryFn: () => getSleepLog(selectedDate),
    enabled: !!user && isOpen,
  })

  // Reset form when opening - default to yesterday (the day you went to bed)
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(yesterday)
      if (sleepLog) {
        setBedtime(sleepLog.bedtime || '')
        setWakeTime(sleepLog.wake_time || '')
        const { hours, minutes } = decimalHoursToHoursMinutes(sleepLog.sleep_duration)
        setSleepHours(hours)
        setSleepMinutes(minutes)
        setSleepQuality(sleepLog.sleep_quality || null)
      } else {
        setBedtime('')
        setWakeTime('')
        setSleepHours(7)
        setSleepMinutes(0)
        setSleepQuality(null)
      }
    }
  }, [isOpen, sleepLog, yesterday])

  // Calculate sleep duration when bedtime or wake time changes
  useEffect(() => {
    if (bedtime && wakeTime && bedtime.includes(':') && wakeTime.includes(':')) {
      try {
        const duration = calculateSleepDuration(bedtime, wakeTime)
        const { hours, minutes } = decimalHoursToHoursMinutes(duration)
        setSleepHours(hours)
        setSleepMinutes(minutes)
      } catch (error) {
        // Invalid time format, keep manual entry
      }
    }
  }, [bedtime, wakeTime])

  const createMutation = useMutation({
    mutationFn: createSleepLog,
    onMutate: async (newSleep) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sleepLog', selectedDate] })
      
      // Snapshot previous value
      const previousSleep = queryClient.getQueryData(['sleepLog', selectedDate])
      
      // Optimistically update the cache immediately
      const optimisticSleep: SleepLog = {
        id: `temp-${Date.now()}`,
        user_id: user?.id || '',
        date: newSleep.date,
        bedtime: newSleep.bedtime || undefined,
        wake_time: newSleep.wake_time || undefined,
        sleep_duration: newSleep.sleep_duration,
        sleep_quality: newSleep.sleep_quality || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      queryClient.setQueryData(['sleepLog', selectedDate], optimisticSleep)
      
      // Also invalidate related queries to trigger updates
      queryClient.invalidateQueries({ queryKey: ['sleepLog'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      
      // Close form immediately
      setIsOpen(false)
      
      return { previousSleep }
    },
    onSuccess: async () => {
      // Refetch to get the actual data from server
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sleepLog'] }),
        queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
      ])
      toast({
        title: 'Sleep logged!',
        description: 'Your sleep has been recorded.',
      })
    },
    onError: async (error, newSleep, context) => {
      // Rollback optimistic update on error
      if (context?.previousSleep !== undefined) {
        queryClient.setQueryData(['sleepLog', selectedDate], context.previousSleep)
      }
      
      // Check for 409 conflict or unique constraint violation
      const errorObj = error as any
      const isConflict = 
        errorObj?.code === '23505' || // PostgreSQL unique constraint violation
        errorObj?.status === 409 || // HTTP 409 Conflict
        (errorObj?.message && errorObj.message.includes('duplicate key')) ||
        (errorObj?.message && errorObj.message.includes('unique constraint'))
      
      // If conflict (already exists), try updating instead
      if (isConflict && sleepLog?.id) {
        updateMutation.mutate({
          id: sleepLog.id,
          date: newSleep.date,
          bedtime: newSleep.bedtime || undefined,
          wake_time: newSleep.wake_time || undefined,
          sleep_duration: newSleep.sleep_duration,
          sleep_quality: newSleep.sleep_quality || undefined,
        })
        return
      }
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log sleep',
        variant: 'destructive',
      })
      setIsOpen(true) // Reopen form on error
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<SleepLog>) => updateSleepLog(id, updates),
    onMutate: async ({ id, ...updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sleepLog', selectedDate] })
      
      // Snapshot previous value
      const previousSleep = queryClient.getQueryData(['sleepLog', selectedDate])
      
      // Optimistically update the cache immediately
      const optimisticSleep: SleepLog = {
        ...(sleepLog as SleepLog),
        ...updates,
        updated_at: new Date().toISOString(),
      }
      
      queryClient.setQueryData(['sleepLog', selectedDate], optimisticSleep)
      
      // Also invalidate related queries to trigger updates
      queryClient.invalidateQueries({ queryKey: ['sleepLog'] })
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      
      // Close form immediately
      setIsOpen(false)
      
      return { previousSleep }
    },
    onSuccess: async () => {
      // Refetch to get the actual data from server
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sleepLog'] }),
        queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
      ])
      toast({
        title: 'Sleep updated!',
        description: 'Your sleep entry has been updated.',
      })
    },
    onError: (error, _updates, context) => {
      // Rollback optimistic update on error
      if (context?.previousSleep !== undefined) {
        queryClient.setQueryData(['sleepLog', selectedDate], context.previousSleep)
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update sleep',
        variant: 'destructive',
      })
      setIsOpen(true) // Reopen form on error
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSleepLog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sleepLog'] })
      await queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      await refetch()
      toast({
        title: 'Deleted',
        description: 'Sleep entry removed.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete entry',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate hours and minutes
    if (sleepHours < 0 || sleepHours > 24 || (sleepHours === 24 && sleepMinutes > 0)) {
      toast({
        title: 'Invalid duration',
        description: 'Please enter a valid sleep duration (0-24 hours)',
        variant: 'destructive',
      })
      return
    }
    
    if (sleepMinutes < 0 || sleepMinutes >= 60) {
      toast({
        title: 'Invalid minutes',
        description: 'Minutes must be between 0 and 59',
        variant: 'destructive',
      })
      return
    }

    const duration = hoursMinutesToDecimalHours(sleepHours, sleepMinutes)
    
    if (duration <= 0) {
      toast({
        title: 'Invalid duration',
        description: 'Sleep duration must be greater than 0',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    
    // If sleep log already exists for this date, update it instead of creating
    if (sleepLog?.id) {
      updateMutation.mutate({
        id: sleepLog.id,
        date: selectedDate,
        bedtime: bedtime || undefined,
        wake_time: wakeTime || undefined,
        sleep_duration: duration,
        sleep_quality: sleepQuality || undefined,
      })
    } else {
      createMutation.mutate({
        date: selectedDate,
        bedtime: bedtime || undefined,
        wake_time: wakeTime || undefined,
        sleep_duration: duration,
        sleep_quality: sleepQuality || undefined,
      })
    }
    setTimeout(() => setIsSubmitting(false), 500)
  }

  // Check if yesterday's sleep is already logged
  const { data: yesterdaySleepLog } = useQuery({
    queryKey: ['sleepLog', yesterday],
    queryFn: () => getSleepLog(yesterday),
    enabled: !!user && !isOpen,
  })

  if (!isOpen) {
    return (
      <div className="card-modern p-3 md:p-4 cursor-pointer transition-colors" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-indigo-500/20 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/30 flex-shrink-0">
              <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Sleep</div>
              <div className="text-xs md:text-sm text-dim font-mono">
                {yesterdaySleepLog 
                  ? `Yesterday: ${formatSleepDuration(yesterdaySleepLog.sleep_duration)} logged` 
                  : 'Log yesterday\'s sleep'}
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
            <Moon className="w-5 h-5 md:w-6 md:h-6 text-indigo-500 fill-indigo-500 dark:text-indigo-500 dark:fill-indigo-500" />
          </div>
          <div>
            <div className="text-xs md:text-sm text-dim font-mono uppercase tracking-wider">
              {isYesterday ? 'Log Yesterday\'s Sleep' : 'Log Sleep'}
            </div>
            {isYesterday && (
              <div className="text-[10px] text-dim font-mono mt-0.5">
                Sleep from last night
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-dim hover:text-text transition-colors p-1.5 md:p-2"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Selector */}
        <div className="space-y-2">
          <label className="text-xs md:text-sm text-dim font-mono block">
            Sleep Date (the day you went to bed)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="input-modern text-xs md:text-sm font-mono flex-1"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(yesterday)}
              className={`btn-secondary text-xs px-2 py-1.5 ${isYesterday ? 'bg-acid/20 border-acid/50' : ''}`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className={`btn-secondary text-xs px-2 py-1.5 ${isToday ? 'bg-acid/20 border-acid/50' : ''}`}
            >
              Today
            </button>
          </div>
          {isYesterday && (
            <p className="text-[10px] text-dim font-mono">
              Logging sleep from last night (you went to bed yesterday)
            </p>
          )}
        </div>

        {/* Bedtime and Wake Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs md:text-sm text-dim font-mono block mb-2">
              <Clock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
              Bedtime
            </label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="input-modern text-sm md:text-base font-mono w-full"
            />
          </div>
          <div>
            <label className="text-xs md:text-sm text-dim font-mono block mb-2">
              <Clock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
              Wake Time
            </label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="input-modern text-sm md:text-base font-mono w-full"
            />
          </div>
        </div>

        {/* Sleep Duration */}
        <div>
          <label className="text-xs md:text-sm text-dim font-mono block mb-2">
            Sleep Duration
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Hours Input */}
            <div>
              <label className="text-[10px] text-dim font-mono block mb-1">Hours</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (sleepHours > 0) {
                      setSleepHours(sleepHours - 1)
                    }
                  }}
                  className="btn-secondary text-xs px-2 py-2"
                  disabled={sleepHours === 0}
                >
                  −
                </button>
                <input
                  type="number"
                  value={sleepHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    if (val >= 0 && val <= 24) {
                      setSleepHours(val)
                      if (val === 24) {
                        setSleepMinutes(0)
                      }
                    }
                  }}
                  min="0"
                  max="24"
                  className="input-modern text-lg md:text-xl text-center font-mono font-bold flex-1 py-2"
                  placeholder="7"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    if (sleepHours < 24) {
                      setSleepHours(sleepHours + 1)
                    }
                  }}
                  className="btn-secondary text-xs px-2 py-2"
                  disabled={sleepHours === 24}
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Minutes Input */}
            <div>
              <label className="text-[10px] text-dim font-mono block mb-1">Minutes</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (sleepMinutes > 0) {
                      setSleepMinutes(sleepMinutes - 1)
                    } else if (sleepHours > 0) {
                      setSleepHours(sleepHours - 1)
                      setSleepMinutes(59)
                    }
                  }}
                  className="btn-secondary text-xs px-2 py-2"
                  disabled={sleepHours === 0 && sleepMinutes === 0}
                >
                  −
                </button>
                <input
                  type="number"
                  value={sleepMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    if (val >= 0 && val < 60) {
                      setSleepMinutes(val)
                    }
                    if (sleepHours === 24 && val > 0) {
                      setSleepMinutes(0)
                    }
                  }}
                  min="0"
                  max="59"
                  className="input-modern text-lg md:text-xl text-center font-mono font-bold flex-1 py-2"
                  placeholder="0"
                  required
                  disabled={sleepHours === 24}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (sleepMinutes < 59 && !(sleepHours === 24)) {
                      setSleepMinutes(sleepMinutes + 1)
                    } else if (sleepHours < 24) {
                      setSleepHours(sleepHours + 1)
                      setSleepMinutes(0)
                    }
                  }}
                  className="btn-secondary text-xs px-2 py-2"
                  disabled={sleepHours === 24}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-dim font-mono mt-1 text-center">
            {formatSleepDuration(hoursMinutesToDecimalHours(sleepHours, sleepMinutes))}
          </p>
        </div>

        {/* Sleep Quality */}
        <div>
          <label className="text-xs md:text-sm text-dim font-mono block mb-2">
            <Star className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
            Sleep Quality (Optional)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setSleepQuality(sleepQuality === rating ? null : rating)}
                className={`flex-1 py-2 px-2 text-xs font-mono rounded-sm border transition-all ${
                  sleepQuality === rating
                    ? 'bg-acid/20 text-acid border-acid/50'
                    : 'bg-surface text-dim border-border hover:border-acid/30'
                }`}
              >
                <Star className={`w-4 h-4 mx-auto ${sleepQuality === rating ? 'fill-acid text-acid' : 'text-dim'}`} />
                <div className="text-[10px] mt-1">{rating}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || (sleepHours === 0 && sleepMinutes === 0)}
          className="btn-primary w-full gap-2 text-sm md:text-base py-3 md:py-4"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-text border-t-transparent rounded-full animate-spin" />
              <span>Logging...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5 md:w-6 md:h-6" />
              <span>{sleepLog ? 'Update Sleep' : 'Log Sleep'}</span>
            </>
          )}
        </button>
      </form>

          {/* Logged Sleep Display */}
      {sleepLog && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-xs md:text-sm text-dim font-mono uppercase tracking-wider mb-3">
            {isYesterday ? "Yesterday's Sleep" : isToday ? "Today's Sleep" : 'Logged Sleep'}
          </div>
          <div className="flex items-center justify-between p-2 md:p-3 bg-surface border border-border rounded-sm">
            <div className="flex-1 min-w-0">
              <div className="text-sm md:text-base font-bold text-text font-mono">
                {formatSleepDuration(sleepLog.sleep_duration)}
              </div>
              <div className="text-xs md:text-sm text-dim font-mono">
                {sleepLog.bedtime && sleepLog.wake_time
                  ? `${sleepLog.bedtime} - ${sleepLog.wake_time}`
                  : 'Duration logged'}
                {sleepLog.sleep_quality && ` • Quality: ${sleepLog.sleep_quality}/5`}
              </div>
            </div>
            <button
              onClick={() => deleteMutation.mutate(sleepLog.id)}
              className="text-dim hover:text-destructive transition-colors p-1.5"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

