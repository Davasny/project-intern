import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { RecordStatusBadge } from "@/components/ui/status-badge/record-status-badge"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { Switch } from "@/components/ui/switch"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import type { RecordState } from "@/features/records/schemas/record-state"

type RecordDetailsHeaderProps = {
  activeRunState: AgentRunState | null
  deleteDisabled: boolean
  deletePending: boolean
  isTogglePending: boolean
  name: string
  onActiveToggle: (checked: boolean) => void
  onDeleteRecord: () => void
  state: RecordState
}

export const RecordDetailsHeader = ({
  activeRunState,
  deleteDisabled,
  deletePending,
  isTogglePending,
  name,
  onActiveToggle,
  onDeleteRecord,
  state,
}: RecordDetailsHeaderProps) => (
  <PageHeader className="gap-3">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 text-balance text-3xl font-semibold tracking-tight text-foreground">
            {name}
          </h1>
          <RecordStatusBadge state={state} />
          {state === "active" || state === "inactive" ? (
            <Switch
              checked={state === "active"}
              disabled={isTogglePending}
              onCheckedChange={onActiveToggle}
            />
          ) : null}
          {activeRunState ? <RunStatusBadge state={activeRunState} /> : null}
        </div>
      </div>
      <PageHeaderActions className="md:justify-end">
        <Button
          disabled={deleteDisabled || deletePending}
          onClick={onDeleteRecord}
          type="button"
          variant="destructive"
        >
          {deletePending ? "Deleting record..." : "Delete record"}
        </Button>
      </PageHeaderActions>
    </div>
  </PageHeader>
)
