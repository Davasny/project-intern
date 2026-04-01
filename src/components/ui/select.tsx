import type { SelectHTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const Select = ({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-900",
      className,
    )}
    {...props}
  />
)
