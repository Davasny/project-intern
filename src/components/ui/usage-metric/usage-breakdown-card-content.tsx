import type { HTMLAttributes } from "react"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { cn } from "@/lib/utils"

export const UsageBreakdownCardContent = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <SectionCardContent
    className={cn(
      "grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9",
      className,
    )}
    {...props}
  />
)
