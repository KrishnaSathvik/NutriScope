import { useState, useEffect, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAlcoholLog, getAlcoholLogs, deleteAlcoholLog, DRINK_TYPES } from '@/services/alcohol'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Wine, Plus, X, Trash2, Check, Flame } from 'lucide-react'
import { AlcoholLog } from '@/types'

// Common drink presets with calories
const DRINK_PRESETS = {
  beer: [
    { name: 'Regular Beer', amount: 1, alcoholContent: 5, calories: 150 },
    { name: 'Light Beer', amount: 1, alcoholContent: 4.2, calories: 100 },
    { name: 'IPA', amount: 1, alcoholContent: 6.5, calories: 180 },
  ],
  wine: [
    { name: 'Red Wine', amount: 1, alcoholContent: 12, calories: 125 },
    { name: 'White Wine', amount: 1, alcoholContent: 12, calories: 120 },
    { name: 'Champagne', amount: 1, alcoholContent: 12, calories: 95 },
  ],
  spirits: [
    { name: 'Vodka', amount: 1, alcoholContent: 40, calories: 97 },
    { name: 'Whiskey', amount: 1, alcoholContent: 40, calories: 97 },
    { name: 'Rum', amount: 1, alcoholContent: 40, calories: 97 },
  ],
  cocktail: [
    { name: 'Margarita', amount: 1, alcoholContent: 15, calories: 150 },
    { name: 'Cosmopolitan', amount: 1, alcoholContent: 15, calories: 150 },
    { name: 'Mojito', amount: 1, alcoholContent: 12, calories: 140 },
  ],
  other: [
    { name: 'Custom Drink', amount: 1, alcoholContent: 12, calories: 120 },
  ],
} as const

export function QuickAlcoholEntry() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [drinkType, setDrinkType] = useState<AlcoholLog['drink_type']>('beer')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [amount, setAmount] = useState<string>('1')
  const [manualCalories, setManualCalories] = useState<number | null>(null)
  const [hasManualEdit, setHasManualEdit] = useState(false)
  const [caloriesInputValue, setCaloriesInputValue] = useState<string>('') // Store raw input value
  const [isEditing, setIsEditing] = useState(false) // Track if user is actively editing
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const isToday = selectedDate === today

  // Get alcohol logs for selected date
  const { data: alcoholLogs, refetch } = useQuery({
    queryKey: ['alcoholLogs', selectedDate],
    queryFn: () => getAlcoholLogs(selectedDate),
    enabled: !!user && isOpen,
  })

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
      setDrinkType('beer')
      setSelectedPreset(null)
      setAmount('1')
      setManualCalories(null)
      setHasManualEdit(false)
    }
  }, [isOpen])

  // Update amount when preset changes (but preserve manual calories if user edited)
  useEffect(() => {
    if (selectedPreset && DRINK_PRESETS[drinkType]) {
      const preset = DRINK_PRESETS[drinkType].find(p => p.name === selectedPreset)
      if (preset) {
        setAmount(preset.amount.toString())
        // Only set calories from preset if user hasn't manually edited
        if (!hasManualEdit && !manualCalories) {
          setManualCalories(preset.calories)
        }
      }
    }
  }, [selectedPreset, drinkType, hasManualEdit])

  // Calculate calories (only when not manually edited)
  const calculatedCalories = useMemo(() => {
    // Don't recalculate if user is manually editing
    if (hasManualEdit && manualCalories !== null) {
      return manualCalories
    }
    if (selectedPreset && DRINK_PRESETS[drinkType]) {
      const preset = DRINK_PRESETS[drinkType].find(p => p.name === selectedPreset)
      if (preset) {
        return preset.calories
      }
    }
    // Fallback calculation
    const caloriesPerDrink: Record<string, number> = {
      beer: 150,
      wine: 120,
      spirits: 100,
      cocktail: 150,
      other: 120,
    }
    return caloriesPerDrink[drinkType] || 120
  }, [amount, drinkType, selectedPreset, hasManualEdit, manualCalories])

  const createMutation = useMutation({
    mutationFn: createAlcoholLog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alcoholLogs'] })
      await queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      await refetch()
      setIsOpen(false)
      toast({
        title: 'Alcohol logged!',
        description: 'Your drink has been recorded.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log alcohol',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAlcoholLog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alcoholLogs'] })
      await queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
      await refetch()
      toast({
        title: 'Deleted',
        description: 'Drink entry removed.',
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
    const amountNum = parseFloat(amount)

    if (!amountNum || amountNum <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid number of drinks',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    
    // Get preset data or use defaults
    let drinkName = 'Custom Drink'
    let alcoholContent: number = DRINK_TYPES[drinkType].defaultAlcoholPercent
    
    if (selectedPreset && DRINK_PRESETS[drinkType]) {
      const preset = DRINK_PRESETS[drinkType].find(p => p.name === selectedPreset)
      if (preset) {
        drinkName = preset.name
        alcoholContent = preset.alcoholContent
      }
    }

    // Calculate final calories (manual override or calculated)
    const finalCalories = manualCalories !== null 
      ? Math.round(manualCalories * amountNum)
      : Math.round(calculatedCalories * amountNum)

    createMutation.mutate({
      date: selectedDate,
      drink_type: drinkType,
      drink_name: drinkName,
      amount: amountNum,
      alcohol_content: alcoholContent,
      calories: finalCalories,
    })
    setTimeout(() => setIsSubmitting(false), 500)
  }

  const totalDrinks = alcoholLogs?.reduce((sum, log) => sum + log.amount, 0) || 0

  if (!isOpen) {
    return (
      <div className="card-modern p-3 md:p-4 cursor-pointer transition-colors" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-amber-500/20 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30 dark:border-amber-500/30 flex-shrink-0">
              <Wine className="w-4 h-4 md:w-5 md:h-5 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-wider">Alcohol</div>
              <div className="text-xs md:text-sm text-dim font-mono">
                {totalDrinks > 0 ? `${totalDrinks} drink${totalDrinks !== 1 ? 's' : ''} today` : 'Log alcohol'}
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
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-amber-500/20 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30 dark:border-amber-500/30 flex-shrink-0">
            <Wine className="w-5 h-5 md:w-6 md:h-6 text-amber-500 fill-amber-500 dark:text-amber-500 dark:fill-amber-500" />
          </div>
          <div>
            <div className="text-xs md:text-sm text-dim font-mono uppercase tracking-wider">Log Alcohol</div>
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
        {/* Date Selector - Compact */}
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
            onClick={() => setSelectedDate(today)}
            className="btn-secondary text-xs px-2 py-1.5"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
            className="btn-secondary text-xs px-2 py-1.5"
          >
            Yesterday
          </button>
        </div>

        {/* Drink Type */}
        <div>
          <label className="text-xs md:text-sm text-dim font-mono block mb-2">Drink Type</label>
          <select
            value={drinkType}
            onChange={(e) => {
              setDrinkType(e.target.value as AlcoholLog['drink_type'])
              setSelectedPreset(null)
              setManualCalories(null)
              setHasManualEdit(false)
            }}
            className="input-modern text-sm md:text-base font-mono w-full"
          >
            {Object.entries(DRINK_TYPES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="text-xs md:text-sm text-dim font-mono block mb-2">Select Drink</label>
          <div className="grid grid-cols-3 gap-2">
            {DRINK_PRESETS[drinkType]?.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setSelectedPreset(preset.name)
                  setAmount(preset.amount.toString())
                  setManualCalories(preset.calories)
                  setHasManualEdit(false) // Reset manual edit flag when selecting preset
                }}
                className={`py-2 px-2 text-xs font-mono rounded-sm border transition-all ${
                  selectedPreset === preset.name
                    ? 'bg-acid/20 text-acid border-acid/50'
                    : 'bg-surface text-dim border-border hover:border-acid/30'
                }`}
              >
                <div className="font-bold">{preset.name}</div>
                <div className="text-[10px] text-dim">{preset.calories} cal</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs md:text-sm text-dim font-mono block mb-2">Quantity</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const newAmount = Math.max(0.25, parseFloat(amount || '1') - 0.25)
                setAmount(newAmount.toFixed(2))
              }}
              className="btn-secondary text-xs px-3 py-2"
            >
              −
            </button>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.25"
              min="0.25"
              max="20"
              className="input-modern text-lg md:text-xl text-center font-mono font-bold flex-1 py-2"
              placeholder="1.0"
              required
            />
            <button
              type="button"
              onClick={() => {
                const newAmount = Math.min(20, parseFloat(amount || '1') + 0.25)
                setAmount(newAmount.toFixed(2))
              }}
              className="btn-secondary text-xs px-3 py-2"
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-dim font-mono mt-1 text-center">Standard drinks</p>
        </div>

        {/* Calories Display - Editable */}
        <div>
          <label className="text-xs md:text-sm text-dim font-mono block mb-2">
            <Flame className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
            Calories
            {manualCalories === null && (
              <span className="text-[9px] text-acid ml-1">(auto-calculated)</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={isEditing || caloriesInputValue !== '' 
                ? caloriesInputValue 
                : (manualCalories !== null 
                    ? Math.round(manualCalories * parseFloat(amount || '1')).toString() 
                    : Math.round(calculatedCalories).toString())
              }
              onChange={(e) => {
                const value = e.target.value
                setIsEditing(true)
                // Always update the input value immediately - this is what makes it editable
                setCaloriesInputValue(value)
                setHasManualEdit(true)
                
                // Update manualCalories as user types (for total calories)
                if (value === '') {
                  // Keep it empty while editing
                  return
                }
                
                const numValue = Number(value)
                if (!isNaN(numValue) && numValue >= 0) {
                  // Store total calories (not per drink) when user is typing
                  const amountNum = parseFloat(amount || '1')
                  // Store as total calories, convert to per-drink for storage
                  setManualCalories(amountNum > 0 ? numValue / amountNum : numValue)
                }
              }}
              onFocus={(e) => {
                setIsEditing(true)
                // Initialize input value when focused - always set it so user can edit
                if (caloriesInputValue === '') {
                  const currentTotal = manualCalories !== null 
                    ? Math.round(manualCalories * parseFloat(amount || '1'))
                    : Math.round(calculatedCalories)
                  setCaloriesInputValue(currentTotal.toString())
                  // Select all text for easy editing
                  setTimeout(() => e.target.select(), 10)
                }
              }}
              onBlur={(e) => {
                setIsEditing(false)
                // Validate and finalize when leaving the field
                const value = e.target.value.trim()
                if (value === '') {
                  // Revert to auto-calculated if empty
                  setCaloriesInputValue('')
                  setManualCalories(null)
                  setHasManualEdit(false)
                } else {
                  const numValue = Number(value)
                  if (!isNaN(numValue) && numValue >= 0) {
                    // Valid value - store it and clear input value to show formatted
                    const amountNum = parseFloat(amount || '1')
                    setManualCalories(amountNum > 0 ? numValue / amountNum : numValue)
                    setCaloriesInputValue('') // Clear to show formatted value
                  } else {
                    // Invalid - revert
                    setCaloriesInputValue('')
                    setManualCalories(null)
                    setHasManualEdit(false)
                  }
                }
              }}
              min="0"
              max="5000"
              step="1"
              className="input-modern text-lg md:text-xl text-center font-mono font-bold flex-1 py-2"
              placeholder="Auto"
            />
            <span className="text-xs text-dim font-mono">cal</span>
            {manualCalories !== null && (
              <button
                type="button"
                onClick={() => {
                  setManualCalories(null)
                  setHasManualEdit(false)
                  setCaloriesInputValue('')
                }}
                className="btn-secondary text-xs px-2 py-1.5"
                title="Use auto-calculated"
              >
                Reset
              </button>
            )}
          </div>
          {manualCalories === null && calculatedCalories > 0 && parseFloat(amount || '1') > 0 && (
            <p className="text-[9px] text-dim font-mono mt-1 text-center">
              {parseFloat(amount || '1').toFixed(2)} drink{parseFloat(amount || '1') !== 1 ? 's' : ''} × {Math.round(calculatedCalories)} cal/drink
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !amount}
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
              <span>Log Drink</span>
            </>
          )}
        </button>
      </form>

      {/* Today's Logs */}
      {alcoholLogs && alcoholLogs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-xs md:text-sm text-dim font-mono uppercase tracking-wider mb-3">
            {isToday ? "Today's Logs" : 'Logged Drinks'}
          </div>
          <div className="space-y-2">
            {alcoholLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 md:p-3 bg-surface border border-border rounded-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm md:text-base font-bold text-text font-mono">
                    {log.drink_name || DRINK_TYPES[log.drink_type].name}
                  </div>
                  <div className="text-xs md:text-sm text-dim font-mono">
                    {log.amount} drink{log.amount !== 1 ? 's' : ''}
                    {log.calories > 0 && ` • ${log.calories} cal`}
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(log.id)}
                  className="text-dim hover:text-destructive transition-colors p-1.5"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs md:text-sm text-dim font-mono">
            Total: <span className="font-bold text-text">{totalDrinks}</span> standard drink{totalDrinks !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
