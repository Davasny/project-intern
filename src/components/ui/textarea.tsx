import type { TextareaHTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "flex min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground",
      className,
    )}
    {...props}
  />
)
