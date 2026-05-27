import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ─── Table Skeleton ────────────────────────────────────────

type TableSkeletonProps = {
  columns?: number
  rows?: number
  className?: string
}

export const TableSkeleton = ({
  columns = 5,
  rows = 5,
  className,
}: TableSkeletonProps) => (
  <div
    className={cn(
      "overflow-hidden rounded-2xl border border-border bg-card",
      className,
    )}
  >
    {/* Header row */}
    <div className="flex items-center gap-4 border-b border-border bg-muted px-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          className="h-3 w-24"
          key={`header-${i}-${columns}-${rows}`}
        />
      ))}
    </div>
    {/* Body rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        className="flex items-center gap-4 border-b border-border px-4 py-3"
        key={`row-${rowIdx}-${columns}-${rows}`}
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton
            className="h-4"
            key={`cell-${rowIdx}-${colIdx}-${columns}-${rows}`}
            style={{ width: `${60 + (colIdx * 17) % 60}px` }}
          />
        ))}
      </div>
    ))}
  </div>
)

// ─── Card Skeleton ─────────────────────────────────────────

type CardSkeletonProps = {
  lines?: number
  className?: string
}

export const CardSkeleton = ({ lines = 3, className }: CardSkeletonProps) => (
  <div
    className={cn(
      "flex flex-col gap-3 rounded-2xl border border-border bg-card p-6",
      className,
    )}
  >
    <Skeleton className="mb-2 h-5 w-1/3" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        className="h-3"
        key={`line-${i}-${lines}`}
        style={{ width: `${100 - i * 12}%` }}
      />
    ))}
  </div>
)

// ─── Form Skeleton ─────────────────────────────────────────

type FormSkeletonProps = {
  fields?: number
  className?: string
}

export const FormSkeleton = ({ fields = 4, className }: FormSkeletonProps) => (
  <div className={cn("flex flex-col gap-6", className)}>
    {Array.from({ length: fields }).map((_, i) => (
      <div className="flex flex-col gap-2" key={`form-field-${i}-${fields}`}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-full" />
      </div>
    ))}
    <Skeleton className="mt-2 h-8 w-24" />
  </div>
)
