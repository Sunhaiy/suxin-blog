export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-xl bg-border/60" />
          <div className="flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-border/50" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-border/50" />
          </div>
        </div>
        <div className="h-8 w-24 animate-pulse rounded-lg bg-border/50" />
      </div>

      {/* Content panel skeleton */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/50">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-border/60" />
        </div>
        <div className="p-5 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-border/60 bg-background/38" />
          ))}
        </div>
      </div>
    </div>
  )
}
