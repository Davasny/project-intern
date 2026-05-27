import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const FileList = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-3", className)} {...props} />
)
