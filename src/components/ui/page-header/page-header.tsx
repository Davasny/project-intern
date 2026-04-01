import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const PageHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <header className={cn("flex flex-col gap-4", className)} {...props} />
)
