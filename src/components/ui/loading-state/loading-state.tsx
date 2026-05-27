import { Loader2Icon } from "lucide-react"
import { CardSkeleton, FormSkeleton, TableSkeleton } from "@/components/ui/page-skeleton/page-skeleton"
import { cn } from "@/lib/utils"

type LoadingStateProps = {
  label: string
  variant?: "text" | "spinner" | "table" | "card" | "form"
  /** For table variant: number of rows to render */
  rows?: number
  /** For table variant: number of columns to render */
  columns?: number
  className?: string
}

export const LoadingState = ({
  label,
  variant = "text",
  rows = 5,
  columns = 5,
  className,
}: LoadingStateProps) => {
  if (variant === "spinner") {
    return (
      <div
        aria-label={label}
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground",
          className,
        )}
        role="status"
      >
        <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
        <span>{label}</span>
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div className={className} role="status">
        <span className="sr-only">{label}</span>
        <TableSkeleton columns={columns} rows={rows} />
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={className} role="status">
        <span className="sr-only">{label}</span>
        <CardSkeleton />
      </div>
    )
  }

  if (variant === "form") {
    return (
      <div className={className} role="status">
        <span className="sr-only">{label}</span>
        <FormSkeleton />
      </div>
    )
  }

  // default: text
  return (
    <div
      aria-label={label}
      className={cn(
        "rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground",
        className,
      )}
      role="status"
    >
      {label}
    </div>
  )
}
