import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const MetadataList = ({
  className,
  ...props
}: HTMLAttributes<HTMLDListElement>) => (
  <dl className={cn("grid gap-4 md:grid-cols-2", className)} {...props} />
)
