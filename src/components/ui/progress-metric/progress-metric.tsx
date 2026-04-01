import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"

type ProgressMetricProps = {
  label: string
  value: number
}

export const ProgressMetric = ({ label, value }: ProgressMetricProps) => (
  <SectionCard>
    <SectionCardContent className="flex flex-col gap-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </span>
    </SectionCardContent>
  </SectionCard>
)
