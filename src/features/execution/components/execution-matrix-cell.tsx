"use client"

import Link from "next/link"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

type ExecutionMatrixCellProps = {
  organizationSlug: string
  projectSlug: string
  taskRecord: {
    latestAgentRun: {
      id: string
      state: AgentRunState
    } | null
    state: TaskRecordState
  } | null
}

export const ExecutionMatrixCell = ({
  organizationSlug,
  projectSlug,
  taskRecord,
}: ExecutionMatrixCellProps) => {
  if (!taskRecord) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  if (taskRecord.latestAgentRun) {
    return (
      <Link
        className="inline-flex"
        href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${taskRecord.latestAgentRun.id}`}
      >
        <RunStatusBadge state={taskRecord.latestAgentRun.state} />
      </Link>
    )
  }

  return <TaskRecordStatusBadge state={taskRecord.state} />
}
