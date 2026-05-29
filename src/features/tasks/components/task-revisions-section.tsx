import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { TaskRevisionItem } from "@/features/tasks/components/task-revision-item"

type TaskRevisionsSectionProps = {
  revisions: {
    createdAt: Date
    id: string
    revisionNumber: number
  }[]
}

export const TaskRevisionsSection = ({
  revisions,
}: TaskRevisionsSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Revision history</h2>
      <p className="text-sm text-muted-foreground">
        Append-only task description revisions.
      </p>
    </SectionCardHeader>
    <SectionCardContent>
      <ActivityTimeline>
        {revisions.map((revision) => (
          <TaskRevisionItem key={revision.id} revision={revision} />
        ))}
      </ActivityTimeline>
    </SectionCardContent>
  </SectionCard>
)
