import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { TaskDefinitionVersionItem } from "@/features/tasks/components/task-definition-version-item"

type TaskRevisionsSectionProps = {
  versions: {
    changes: {
      field: string
      label: string
      after: string
      before: string
    }[]
    createdAt: Date
    id: string
    model: string | null
    schemaVersion: number
    temperature: number | null
    title: string
    versionNumber: number
  }[]
}

export const TaskRevisionsSection = ({
  versions,
}: TaskRevisionsSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Versions</h2>
    </SectionCardHeader>
    <SectionCardContent>
      <ActivityTimeline>
        {versions.map((version) => (
          <TaskDefinitionVersionItem key={version.id} version={version} />
        ))}
      </ActivityTimeline>
    </SectionCardContent>
  </SectionCard>
)
