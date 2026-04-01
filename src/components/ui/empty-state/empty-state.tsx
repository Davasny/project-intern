import type { ReactNode } from "react"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"

type EmptyStateProps = {
  action: ReactNode
  description: string
  title: string
}

export const EmptyState = ({ action, description, title }: EmptyStateProps) => (
  <SectionCard>
    <SectionCardContent className="flex flex-col items-start gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </SectionCardContent>
  </SectionCard>
)
