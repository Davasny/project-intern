import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const ArtifactList = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-3", className)} {...props} />
)
