import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const Card = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-slate-200 bg-white shadow-sm",
      className,
    )}
    {...props}
  />
)
