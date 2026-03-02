import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Basic skeleton components
function SkeletonText({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />
}

function SkeletonTitle({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-6 w-3/4", className)} {...props} />
}

function SkeletonAvatar({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} {...props} />
}

function SkeletonButton({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-24", className)} {...props} />
}

// Card skeletons
function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 shadow-sm", className)} {...props}>
      <div className="space-y-3">
        <SkeletonTitle />
        <SkeletonText className="w-1/2" />
        <SkeletonText className="w-3/4" />
      </div>
    </div>
  )
}

// Table skeleton
function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
  ...props
}: SkeletonProps & { rows?: number; columns?: number }) {
  return (
    <div className={cn("rounded-lg border bg-card", className)} {...props}>
      {/* Table header */}
      <div className="border-b px-4 py-3">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonText key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Table rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <SkeletonText key={colIndex} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Form skeleton
function SkeletonForm({ fields = 4, className, ...props }: SkeletonProps & { fields?: number }) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonText className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end space-x-2">
        <SkeletonButton />
        <SkeletonButton />
      </div>
    </div>
  )
}

// Stats card skeleton
function SkeletonStatsCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)} {...props}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonText className="h-4 w-20" />
          <SkeletonTitle className="w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}

// Chart skeleton
function SkeletonChart({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)} {...props}>
      <div className="space-y-4">
        <SkeletonTitle />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

// Profile skeleton
function SkeletonProfile({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="flex items-center space-x-4">
        <SkeletonAvatar className="h-16 w-16" />
        <div className="space-y-2">
          <SkeletonTitle className="w-32" />
          <SkeletonText className="w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonTitle,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonStatsCard,
  SkeletonChart,
  SkeletonProfile,
}
