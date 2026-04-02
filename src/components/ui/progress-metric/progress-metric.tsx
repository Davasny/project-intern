import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"

type ProgressMetricProps = {
  label: string
  value: number
}

export const ProgressMetric = ({ label, value }: ProgressMetricProps) => (
  <SectionCard>
    <SectionCardContent className="flex flex-col gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-foreground text-3xl font-semibold tracking-tight">
        {value}
      </span>
    </SectionCardContent>
  </SectionCard>
)
