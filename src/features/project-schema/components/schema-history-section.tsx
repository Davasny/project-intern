import { ChevronDown } from "lucide-react"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SchemaVersionTimelineItem } from "@/features/project-schema/components/schema-version-timeline-item"
import { cn } from "@/lib/utils"

type SchemaVersion = Parameters<typeof SchemaVersionTimelineItem>[0]["version"]

type SchemaHistorySectionProps = {
  activeVersionId: string
  isExpanded: boolean
  onCompare: (versionId: string) => void
  onToggle: () => void
  taskHrefBase: string
  versions: SchemaVersion[]
}

export const SchemaHistorySection = ({
  activeVersionId,
  isExpanded,
  onCompare,
  onToggle,
  taskHrefBase,
  versions,
}: SchemaHistorySectionProps) => (
  <SectionCard>
    <button
      className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      onClick={onToggle}
      type="button"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">
          Schema version history
        </h2>
        <p className="text-sm text-muted-foreground">
          {versions.length} versions · Compare with active version
        </p>
      </div>
      <ChevronDown
        className={cn(
          "h-5 w-5 text-muted-foreground transition-transform",
          isExpanded && "rotate-180",
        )}
      />
    </button>
    {isExpanded ? (
      <SectionCardContent className="flex flex-col divide-y divide-border/70 border-t border-border pt-4">
        {versions.length > 0 ? (
          versions.map((version) => (
            <SchemaVersionTimelineItem
              canCompare={version.id !== activeVersionId}
              isActive={version.id === activeVersionId}
              key={version.id}
              onCompare={() => onCompare(version.id)}
              taskHrefBase={taskHrefBase}
              version={version}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No schema versions found.</p>
        )}
      </SectionCardContent>
    ) : null}
  </SectionCard>
)
