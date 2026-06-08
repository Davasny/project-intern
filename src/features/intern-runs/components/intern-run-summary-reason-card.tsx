import { Badge } from "@/components/ui/badge"
import { MarkdownViewer } from "@/components/ui/markdown-viewer/markdown-viewer"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"

type InternRunSummaryReasonCardProps = {
  details: {
    errorCode: string | null
    label: "Reason" | "Summary"
    text: string
    title: string
  }
}

export const InternRunSummaryReasonCard = ({
  details,
}: InternRunSummaryReasonCardProps) => (
  <SectionCard>
    <SectionCardHeader className="flex-row items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">
          {details.title}
        </h2>
      </div>
      {details.errorCode !== null ? (
        <Badge className="border-destructive/30 bg-destructive/10 font-mono text-destructive">
          {details.errorCode}
        </Badge>
      ) : null}
    </SectionCardHeader>
    <SectionCardContent>
      <MarkdownViewer value={details.text} />
    </SectionCardContent>
  </SectionCard>
)
