import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ReminderSettings } from '@/types'
import { notificationService } from '@/services/notifications'
import { Bell, Clock, Droplet, Dumbbell, Target, CheckCircle2, X, Scale, Flame, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ReminderSettingsSection() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)

  const defaultSettings: ReminderSettings = {
    enabled: false,
    meal_reminders: {
      enabled: false,
      breakfast: '08:00',
      lunch: '12:30',
      dinner: '19:00',
      morning_snack: '10:00',
      evening_snack: '15:00',
    },
    water_reminders: {
      enabled: false,
      interval_minutes: 60,
      start_time: '08:00',
      end_time: '22:00',
    },
    workout_reminders: {
      enabled: false,
      time: '18:00',
      days: [1, 2, 3, 4, 5], // Weekdays
    },
    goal_reminders: {
      enabled: false,
      check_progress_time: '20:00',
    },
    weight_reminders: {
      enabled: false,
      time: '08:00',
      days: [1, 2, 3, 4, 5, 6, 0], // Daily by default
    },
    streak_reminders: {
      enabled: false,
      time: '19:00',
      check_days: [1, 2, 3, 4, 5], // Weekdays by default
    },
    summary_reminders: {
      enabled: false,
      time: '20:00',
    },
  }

  const [settings, setSettings] = useState<ReminderSettings>(
    profile?.reminder_settings || defaultSettings
  )

  useEffect(() => {
    if (profile?.reminder_settings) {
      setSettings(profile.reminder_settings)
    }
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: async (data: { reminder_settings: ReminderSettings }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setEditing(false)
      toast({
        title: 'Reminder settings saved',
        description: 'Your reminder preferences have been updated.',
      })
    },
  })

  const handleRequestPermission = async () => {
    const permission = await notificationService.requestPermission()
    if (permission === 'granted') {
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive reminders.',
      })
      setSettings({ ...settings, enabled: true })
    } else {
      toast({
        title: 'Permission denied',
        description: 'Please enable notifications in your browser settings.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({ reminder_settings: settings })
  }

  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ]

  return (
    <div className="card-modern border-acid/30 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-purple-500/20 dark:bg-purple-500/20 flex items-center justify-center border border-purple-500/30 dark:border-purple-500/30 flex-shrink-0">
            <Bell className="w-4 h-4 md:w-5 md:h-5 text-purple-500 fill-purple-500 dark:text-purple-500 dark:fill-purple-500" />
          </div>
          <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
            Reminders & Notifications
          </h2>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary gap-1.5 md:gap-2 text-[10px] md:text-xs"
          >
            <span>Configure</span>
          </button>
        )}
      </div>

      {!notificationService.hasPermission() && (
        <div className="mb-4 p-4 border border-warning/30 bg-warning/5 rounded-sm">
          <p className="text-sm text-text font-mono mb-3">
            Enable browser notifications to receive reminders.
          </p>
          <button
            onClick={handleRequestPermission}
            className="btn-primary text-xs"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 border border-border rounded-sm">
            <div>
              <label className="text-sm font-bold text-text font-mono uppercase">
                Enable Reminders
              </label>
              <p className="text-xs text-dim font-mono mt-1">
                Receive notifications for meals, water, workouts, and goals
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings({ ...settings, enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
            </label>
          </div>

          {settings.enabled && (
            <>
              {/* Meal Reminders */}
              <div className="p-4 border border-border rounded-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-acid" />
                  <label className="text-sm font-bold text-text font-mono uppercase">
                    Meal Reminders
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.meal_reminders?.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          meal_reminders: {
                            ...settings.meal_reminders,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
                  </label>
                </div>

                {settings.meal_reminders?.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Breakfast
                      </label>
                      <input
                        type="time"
                        value={settings.meal_reminders.breakfast || '08:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            meal_reminders: {
                              ...settings.meal_reminders,
                              breakfast: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Lunch
                      </label>
                      <input
                        type="time"
                        value={settings.meal_reminders.lunch || '12:30'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            meal_reminders: {
                              ...settings.meal_reminders,
                              lunch: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Dinner
                      </label>
                      <input
                        type="time"
                        value={settings.meal_reminders.dinner || '19:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            meal_reminders: {
                              ...settings.meal_reminders,
                              dinner: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Morning Snack
                      </label>
                      <input
                        type="time"
                        value={settings.meal_reminders.morning_snack || '10:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            meal_reminders: {
                              ...settings.meal_reminders,
                              morning_snack: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Evening Snack
                      </label>
                      <input
                        type="time"
                        value={settings.meal_reminders.evening_snack || '15:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            meal_reminders: {
                              ...settings.meal_reminders,
                              evening_snack: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Water Reminders */}
              <div className="p-4 border border-border rounded-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Droplet className="w-4 h-4 text-acid" />
                  <label className="text-sm font-bold text-text font-mono uppercase">
                    Water Reminders
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.water_reminders?.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          water_reminders: {
                            ...settings.water_reminders,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
                  </label>
                </div>

                {settings.water_reminders?.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Interval (minutes)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="240"
                        step="15"
                        value={settings.water_reminders.interval_minutes || 60}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            water_reminders: {
                              ...settings.water_reminders,
                              interval_minutes: Number(e.target.value),
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={settings.water_reminders.start_time || '08:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            water_reminders: {
                              ...settings.water_reminders,
                              start_time: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={settings.water_reminders.end_time || '22:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            water_reminders: {
                              ...settings.water_reminders,
                              end_time: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Workout Reminders */}
              <div className="p-4 border border-border rounded-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Dumbbell className="w-4 h-4 text-acid" />
                  <label className="text-sm font-bold text-text font-mono uppercase">
                    Workout Reminders
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.workout_reminders?.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          workout_reminders: {
                            ...settings.workout_reminders,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
                  </label>
                </div>

                {settings.workout_reminders?.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={settings.workout_reminders.time || '18:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            workout_reminders: {
                              ...settings.workout_reminders,
                              time: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2 mb-3">
                        Days of Week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                settings.workout_reminders.days?.includes(
                                  day.value
                                ) || false
                              }
                              onChange={(e) => {
                                const currentDays =
                                  settings.workout_reminders.days || []
                                const newDays = e.target.checked
                                  ? [...currentDays, day.value]
                                  : currentDays.filter((d) => d !== day.value)
                                setSettings({
                                  ...settings,
                                  workout_reminders: {
                                    ...settings.workout_reminders,
                                    days: newDays,
                                  },
                                })
                              }}
                              className="w-4 h-4 border-border bg-surface text-acid focus:ring-acid/20"
                            />
                            <span className="text-xs font-mono text-text">
                              {day.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Goal Reminders */}
              <div className="p-4 border border-border rounded-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-acid" />
                  <label className="text-sm font-bold text-text font-mono uppercase">
                    Goal Progress Reminders
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.goal_reminders?.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          goal_reminders: {
                            ...settings.goal_reminders,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
                  </label>
                </div>

                {settings.goal_reminders?.enabled && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                      Check Progress Time
                    </label>
                    <input
                      type="time"
                      value={
                        settings.goal_reminders.check_progress_time || '20:00'
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          goal_reminders: {
                            ...settings.goal_reminders,
                            check_progress_time: e.target.value,
                          },
                        })
                      }
                      className="input-modern"
                    />
                  </div>
                )}
              </div>

              {/* Weight Reminders */}
              <div className="p-4 border border-border rounded-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="w-4 h-4 text-acid" />
                  <label className="text-sm font-bold text-text font-mono uppercase">
                    Weight Logging Reminders
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.weight_reminders?.enabled || false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          weight_reminders: {
                            ...settings.weight_reminders,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
                  </label>
                </div>

                {settings.weight_reminders?.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={settings.weight_reminders.time || '08:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            weight_reminders: {
                              ...settings.weight_reminders,
                              time: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2 mb-3">
                        Days of Week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                settings.weight_reminders.days?.includes(
                                  day.value
                                ) || false
                              }
                              onChange={(e) => {
                                const currentDays =
                                  settings.weight_reminders.days || []
                                const newDays = e.target.checked
                                  ? [...currentDays, day.value]
                                  : currentDays.filter((d) => d !== day.value)
                                setSettings({
                                  ...settings,
                                  weight_reminders: {
                                    ...settings.weight_reminders,
                                    days: newDays,
                                  },
                                })
                              }}
                              className="w-4 h-4 border-border bg-surface text-acid focus:ring-acid/20"
                            />
                            <span className="text-xs font-mono text-text">
                              {day.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Streak Reminders */}
              <div className="p-4 border border-border rounded-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-4 h-4 text-acid" />
                  <label className="text-sm font-bold text-text font-mono uppercase">
                    Streak Reminders
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.streak_reminders?.enabled || false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          streak_reminders: {
                            ...settings.streak_reminders,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
                  </label>
                </div>

                {settings.streak_reminders?.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={settings.streak_reminders.time || '19:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            streak_reminders: {
                              ...settings.streak_reminders,
                              time: e.target.value,
                            },
                          })
                        }
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2 mb-3">
                        Check Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                settings.streak_reminders.check_days?.includes(
                                  day.value
                                ) || false
                              }
                              onChange={(e) => {
                                const currentDays =
                                  settings.streak_reminders.check_days || []
                                const newDays = e.target.checked
                                  ? [...currentDays, day.value]
                                  : currentDays.filter((d) => d !== day.value)
                                setSettings({
                                  ...settings,
                                  streak_reminders: {
                                    ...settings.streak_reminders,
                                    check_days: newDays,
                                  },
                                })
                              }}
                              className="w-4 h-4 border-border bg-surface text-acid focus:ring-acid/20"
                            />
                            <span className="text-xs font-mono text-text">
                              {day.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Reminders */}
              <div className="p-4 border border-border rounded-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-acid" />
                  <label className="text-sm font-bold text-text font-mono uppercase">
                    Daily Summary Reminders
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.summary_reminders?.enabled || false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          summary_reminders: {
                            ...settings.summary_reminders,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-panel border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-acid/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dim after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acid"></div>
                  </label>
                </div>

                {settings.summary_reminders?.enabled && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-dim mb-2">
                      Summary Time
                    </label>
                    <input
                      type="time"
                      value={settings.summary_reminders.time || '20:00'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          summary_reminders: {
                            ...settings.summary_reminders,
                            time: e.target.value,
                          },
                        })
                      }
                      className="input-modern"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex space-x-4 pt-4 border-t border-border">
            <button
              type="submit"
              className="btn-primary gap-2"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setSettings(
                  profile?.reminder_settings || defaultSettings
                )
              }}
              className="btn-secondary gap-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text font-mono uppercase">
                Reminders Status
              </span>
              <span
                className={`text-xs font-mono px-2 py-1 rounded-sm ${
                  settings.enabled
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-dim/20 text-dim border border-border'
                }`}
              >
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {settings.enabled && (
              <div className="mt-4 space-y-2 text-xs text-dim font-mono">
                {settings.meal_reminders?.enabled && (
                  <div>✓ Meal reminders configured</div>
                )}
                {settings.water_reminders?.enabled && (
                  <div>
                    ✓ Water reminders every{' '}
                    {settings.water_reminders.interval_minutes} minutes
                  </div>
                )}
                {settings.workout_reminders?.enabled && (
                  <div>
                    ✓ Workout reminders on{' '}
                    {settings.workout_reminders.days?.length || 0} days/week
                  </div>
                )}
                {settings.goal_reminders?.enabled && (
                  <div>✓ Goal progress reminders enabled</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

