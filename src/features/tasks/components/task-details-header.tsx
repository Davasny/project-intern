import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { PageHeaderMeta } from "@/components/ui/page-header/page-header-meta"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { TaskStatusBadge } from "@/components/ui/status-badge/task-status-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { TaskSummaryState } from "@/features/tasks/schemas/task-summary-state"

type TaskDraftState =
  | "accepted"
  | "accepting"
  | "accepting_failed"
  | "created"
  | "rejected"
  | "rejecting"
  | "rejecting_failed"

type TaskDetailsHeaderProps = {
  deleteDisabledReason: string | null
  draftActionPending: boolean
  onAcceptDraft: () => Promise<void>
  onDownloadTaskDescription: () => void
  onEditTask: () => void
  onRejectDraft: () => Promise<void>
  onRemoveTask: () => void
  onResetDownstream: () => void
  schemaVersion: number
  sortOrder: number
  state: TaskDraftState
  summaryState: TaskSummaryState
  title: string
  updatedAt: Date
}

const draftStatusLabelMap: Record<TaskDraftState, string> = {
  accepted: "accepted",
  accepting: "accepting",
  accepting_failed: "accept failed",
  created: "draft",
  rejected: "rejected",
  rejecting: "rejecting",
  rejecting_failed: "reject failed",
}

const draftStatusToneMap: Record<
  TaskDraftState,
  "danger" | "info" | "muted" | "success" | "warning"
> = {
  accepted: "success",
  accepting: "info",
  accepting_failed: "danger",
  created: "warning",
  rejected: "danger",
  rejecting: "info",
  rejecting_failed: "danger",
}

export const TaskDetailsHeader = ({
  deleteDisabledReason,
  draftActionPending,
  onAcceptDraft,
  onDownloadTaskDescription,
  onEditTask,
  onRejectDraft,
  onRemoveTask,
  onResetDownstream,
  schemaVersion,
  sortOrder,
  state,
  summaryState,
  title,
  updatedAt,
}: TaskDetailsHeaderProps) => (
  <PageHeader className="gap-3">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-row flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {state === "accepted" ? (
            <TaskStatusBadge state={summaryState} />
          ) : (
            <StatusBadge
              label={draftStatusLabelMap[state]}
              tone={draftStatusToneMap[state]}
            />
          )}
        </div>
        <PageHeaderMeta>
          <span>Sort {sortOrder}</span>
          <span>•</span>
          <span>Schema v{schemaVersion}</span>
          <span>•</span>
          <span>Updated {updatedAt.toLocaleString()}</span>
        </PageHeaderMeta>
      </div>
      <PageHeaderActions className="md:justify-end">
        {state === "created" ? (
          <>
            <Button
              disabled={draftActionPending}
              onClick={onRejectDraft}
              type="button"
              variant="outline"
            >
              Reject draft
            </Button>
            <Button
              disabled={draftActionPending}
              onClick={onAcceptDraft}
              type="button"
            >
              Accept draft
            </Button>
          </>
        ) : null}
        <Button onClick={onEditTask} type="button">
          Edit task
        </Button>
        <Button
          onClick={onDownloadTaskDescription}
          type="button"
          variant="outline"
        >
          Download task description
        </Button>
        {state === "accepted" ? (
          <Button onClick={onResetDownstream} type="button" variant="outline">
            Reset downstream
          </Button>
        ) : null}
        {deleteDisabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button disabled type="button" variant="destructive">
                  Delete task
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{deleteDisabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          <Button onClick={onRemoveTask} type="button" variant="destructive">
            Delete task
          </Button>
        )}
      </PageHeaderActions>
    </div>
  </PageHeader>
)
