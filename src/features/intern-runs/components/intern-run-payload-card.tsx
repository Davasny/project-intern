import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"

type InternRunPayloadCardProps = {
  payload: Record<string, unknown>
  title: string
}

export const InternRunPayloadCard = ({
  payload,
  title,
}: InternRunPayloadCardProps) => (
  <Collapsible asChild>
    <SectionCard>
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-3 text-left">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Raw JSON payload for debugging
          </p>
        </div>
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SectionCardContent className="border-t border-border pt-4">
          <JsonViewer value={payload} />
        </SectionCardContent>
      </CollapsibleContent>
    </SectionCard>
  </Collapsible>
)
