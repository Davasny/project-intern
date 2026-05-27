import type { ReactNode } from "react"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  action: ReactNode
  description: string
  title: string
  icon?: ReactNode
  variant?: "card" | "full-page"
}

export const EmptyState = ({
  action,
  description,
  icon,
  title,
  variant = "card",
}: EmptyStateProps) => {
  const content = (
    <div className="flex flex-col items-start gap-4">
      {icon ? (
        <div aria-hidden="true" className="flex items-center gap-3">
          <span className="size-5 shrink-0 text-muted-foreground">{icon}</span>
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h3 className="text-foreground text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      )}
      {action}
    </div>
  )

  if (variant === "full-page") {
    return (
      <div
        className={cn(
          "flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6",
        )}
      >
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          {icon ? (
            <span
              aria-hidden="true"
              className="size-12 shrink-0 text-muted-foreground"
            >
              {icon}
            </span>
          ) : null}
          <h3 className="text-foreground text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
          {action}
        </div>
      </div>
    )
  }

  return <SectionCard>
    <SectionCardContent className="flex flex-col items-start gap-4">
      {content}
    </SectionCardContent>
  </SectionCard>
}
