import type { TextareaHTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "flex min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900",
      className,
    )}
    {...props}
  />
)
