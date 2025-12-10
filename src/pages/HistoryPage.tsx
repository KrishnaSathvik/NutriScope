import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { getDailyLog } from '@/services/dailyLogs'
import { Calendar, ChevronLeft, ChevronRight, ArrowRight, Flame, UtensilsCrossed, Activity, Droplet, Beef } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  // Set up realtime subscriptions for history data
  useUserRealtimeSubscription('meals', ['dailyLog', 'weekLogs'], user?.id)
  useUserRealtimeSubscription('exercises', ['dailyLog', 'weekLogs'], user?.id)
  useUserRealtimeSubscription('daily_logs', ['dailyLog', 'weekLogs'], user?.id)

  const { data: dailyLog, isLoading } = useQuery({
    queryKey: ['dailyLog', dateStr],
    queryFn: () => getDailyLog(dateStr),
  })

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(selectedDate, { weekStartsOn: 0 }) })

  // Fetch logs for all week days to show activity indicators
  const weekDateStrings = weekDays.map(day => format(day, 'yyyy-MM-dd'))
  const { data: weekLogs } = useQuery({
    queryKey: ['weekLogs', weekDateStrings],
    queryFn: async () => {
      const logs = await Promise.all(
        weekDateStrings.map(date => getDailyLog(date))
      )
      return logs
    },
  })

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      <div className="border-b border-border pb-4 md:pb-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="h-px w-6 md:w-8 bg-acid"></div>
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">Activity History</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">History</h1>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="card-modern p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <button
            onClick={() => setSelectedDate(subDays(selectedDate, 7))}
            className="p-2 hover:bg-panel rounded-sm transition-colors text-dim hover:text-text active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">{format(weekStart, 'MMMM yyyy').toUpperCase()}</h2>
          <button
            onClick={() => setSelectedDate(subDays(selectedDate, -7))}
            className="p-2 hover:bg-panel rounded-sm transition-colors text-dim hover:text-text active:scale-95"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {weekDays.map((day, index) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const isSelected = dayStr === dateStr
            const dayLog = weekLogs?.[index]
            const hasActivity = dayLog && (dayLog.meals.length > 0 || dayLog.exercises.length > 0 || dayLog.water_intake > 0)
            const isToday = dayStr === format(new Date(), 'yyyy-MM-dd')
            
            return (
              <button
                key={dayStr}
                onClick={() => setSelectedDate(day)}
                className={`relative p-2 md:p-3 rounded-sm text-center transition-all active:scale-95 text-[10px] leading-tight min-h-[40px] ${
                  isSelected
                    ? 'bg-acid text-[#020617] dark:text-[#020617] font-bold'
                    : isToday
                    ? 'bg-panel border-2 border-acid/60 text-text'
                    : 'bg-panel border border-border hover:border-acid text-text'
                }`}
              >
                <div className={`text-[9px] md:text-xs mb-0.5 md:mb-1 font-mono uppercase ${isSelected ? 'text-[#020617] dark:text-[#020617]' : 'text-dim'}`}>{format(day, 'EEE')}</div>
                <div className={`text-sm md:text-base font-bold font-mono ${isSelected ? 'text-[#020617] dark:text-[#020617]' : ''}`}>{format(day, 'd')}</div>
                {hasActivity && !isSelected && (
                  <div className="absolute bottom-0.5 md:bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                    {dayLog.meals.length > 0 && (
                      <div className="w-1 h-1 bg-acid rounded-full" title={`${dayLog.meals.length} meals`} />
                    )}
                    {dayLog.exercises.length > 0 && (
                      <div className="w-1 h-1 bg-success rounded-full" title={`${dayLog.exercises.length} workouts`} />
                    )}
                    {dayLog.water_intake > 0 && (
                      <div className="w-1 h-1 bg-blue-500 dark:bg-blue-500 rounded-full" title={`${dayLog.water_intake}ml water`} />
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Date Summary */}
      {isLoading ? (
        <div className="text-center py-8 md:py-12 text-dim font-mono text-xs">Loading...</div>
      ) : dailyLog ? (
        <div className="space-y-4 md:space-y-6">
          <div className="card-modern border-acid/30 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 md:gap-4 mb-4 md:mb-6">
              <button
                onClick={() => navigate(`/summary/${dateStr}`)}
                className="btn-secondary gap-1.5 md:gap-2 text-[10px] md:text-xs"
              >
                <span className="hidden sm:inline">View Full Summary</span>
                <span className="sm:hidden">Summary</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                  <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 fill-orange-500 dark:text-orange-500 dark:fill-orange-500 flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Calories</div>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-orange-500 dark:text-acid font-mono">{dailyLog.calories_consumed}</div>
              </div>
              <div className="border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                  <Beef className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 fill-emerald-500 dark:text-emerald-500 dark:fill-emerald-500 flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Protein</div>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-emerald-500 dark:text-text font-mono">{dailyLog.protein}g</div>
              </div>
              <div className="border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                  <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500 flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Workouts</div>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-purple-500 dark:text-acid font-mono">{dailyLog.exercises.length}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                  <Droplet className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 fill-blue-500 dark:text-blue-500 dark:fill-blue-500 flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-dim font-mono uppercase">Water</div>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-blue-500 dark:text-text font-mono">{dailyLog.water_intake}ml</div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="card-modern text-center border-dashed py-8 md:py-12 px-4">
          <Calendar className="w-10 h-10 md:w-12 md:h-12 text-dim mx-auto mb-3 md:mb-4 opacity-50" />
          <p className="text-dim font-mono text-xs md:text-sm">No activity found for this date</p>
        </div>
      )}
    </div>
  )
}
