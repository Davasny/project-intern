import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const PageHeaderMeta = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "text-muted-foreground flex flex-wrap items-center gap-2 text-sm",
      className,
    )}
    {...props}
  />
)
