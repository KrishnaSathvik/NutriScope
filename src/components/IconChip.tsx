import { ComponentType } from 'react'
import clsx from 'clsx'

interface IconChipProps {
  icon: ComponentType<{ className?: string }>
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function IconChip({ icon: Icon, active = false, size = 'md', className }: IconChipProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <div
      className={clsx(
        sizeClasses[size],
        'rounded-xl flex items-center justify-center transition-all duration-200',
        active
          ? 'bg-accent-soft text-acid shadow-[0_0_18px_rgba(20,184,166,0.4)] dark:shadow-[0_0_18px_rgba(196,255,71,0.45)] scale-[1.02]'
          : 'bg-icon-soft text-dim group-hover:text-text group-hover:bg-icon-soft/80 active:scale-95',
        className
      )}
    >
      <Icon className={iconSizeClasses[size]} />
    </div>
  )
}

