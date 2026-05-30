"use client"

import Link from "next/link"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { ExecutionMatrixCellAction } from "@/features/execution/components/execution-matrix-cell-action"
import { ExecutionMatrixRunStatusBadge } from "@/features/execution/components/execution-matrix-run-status-badge"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

type ExecutionMatrixCellProps = {
  debugControlsEnabled: boolean
  isAutopickEnabled: boolean
  organizationSlug: string
  projectSlug: string
  taskRecord: {
    attemptCount: number
    latestAgentRun: {
      id: string
      state: AgentRunState
    } | null
    recordId: string
    state: TaskRecordState
    taskRecordId: string
  } | null
}

export const ExecutionMatrixCell = ({
  debugControlsEnabled,
  isAutopickEnabled,
  organizationSlug,
  projectSlug,
  taskRecord,
}: ExecutionMatrixCellProps) => {
  if (!taskRecord) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  if (taskRecord.latestAgentRun) {
    return (
      <div className="flex flex-row items-center gap-1.5">
        <Link
          className="inline-flex"
          href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${taskRecord.latestAgentRun.id}`}
        >
          <ExecutionMatrixRunStatusBadge
            attemptCount={taskRecord.attemptCount}
            state={taskRecord.latestAgentRun.state}
          />
        </Link>
        <ExecutionMatrixCellAction
          debugControlsEnabled={debugControlsEnabled}
          isAutopickEnabled={isAutopickEnabled}
          taskRecord={taskRecord}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center gap-1.5">
      <TaskRecordStatusBadge state={taskRecord.state} />
      <ExecutionMatrixCellAction
        debugControlsEnabled={debugControlsEnabled}
        isAutopickEnabled={isAutopickEnabled}
        taskRecord={taskRecord}
      />
    </div>
  )
}
