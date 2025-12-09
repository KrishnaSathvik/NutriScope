export function CardSkeleton() {
  return (
    <div className="card-modern p-4 md:p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-sm bg-border" />
        <div className="flex-1">
          <div className="h-4 bg-border rounded w-32 mb-2" />
          <div className="h-3 bg-border rounded w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-border rounded w-full" />
        <div className="h-3 bg-border rounded w-5/6" />
        <div className="h-3 bg-border rounded w-4/6" />
      </div>
    </div>
  )
}

export function MealCardSkeleton() {
  return (
    <div className="card-modern p-4 md:p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-sm bg-border" />
        <div className="flex-1">
          <div className="h-5 bg-border rounded w-32 mb-2" />
          <div className="h-3 bg-border rounded w-20" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-border rounded w-16" />
            <div className="h-4 bg-border rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="card-modern p-4 md:p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-sm bg-border" />
        <div className="h-4 bg-border rounded w-48" />
      </div>
      <div className="h-64 md:h-80 bg-border rounded" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card-modern p-3 md:p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-sm bg-border" />
        <div className="h-3 bg-border rounded w-20" />
      </div>
      <div className="h-6 bg-border rounded w-16 mb-2" />
      <div className="h-1 bg-border rounded w-full" />
    </div>
  )
}

