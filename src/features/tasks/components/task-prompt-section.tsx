import { MarkdownViewer } from "@/components/ui/markdown-viewer/markdown-viewer"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { TaskRunConfiguration } from "@/features/tasks/components/task-run-configuration"

type TaskPromptSectionProps = {
  createdAt: Date
  descriptionMarkdown: string
  effectiveModel: string
  effectiveTemperature: number
  model: string | null
  schemaVersion: number
  sortOrder: number
  temperature: number | null
  updatedAt: Date
}

export const TaskPromptSection = ({
  createdAt,
  descriptionMarkdown,
  effectiveModel,
  effectiveTemperature,
  model,
  schemaVersion,
  sortOrder,
  temperature,
  updatedAt,
}: TaskPromptSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Task prompt</h2>
    </SectionCardHeader>
    <SectionCardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-xl border border-border bg-background px-4 py-4">
        <MarkdownViewer value={descriptionMarkdown} />
      </div>
      <aside className="flex flex-col gap-3">
        <dl className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Schema
            </dt>
            <dd className="text-sm font-medium text-foreground">v{schemaVersion}</dd>
          </div>
          <div className="flex flex-row items-center justify-between gap-3">
            <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sort order
            </dt>
            <dd className="text-sm font-medium text-foreground">{sortOrder}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Effective model
            </dt>
            <dd className="break-words text-sm text-foreground">{effectiveModel}</dd>
          </div>
          <div className="flex flex-row items-center justify-between gap-3">
            <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Temperature
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {effectiveTemperature.toFixed(1)}
            </dd>
          </div>
        </dl>
        <TaskRunConfiguration
          createdAt={createdAt}
          effectiveModel={effectiveModel}
          effectiveTemperature={effectiveTemperature}
          model={model}
          temperature={temperature}
          updatedAt={updatedAt}
        />
      </aside>
    </SectionCardContent>
  </SectionCard>
)
