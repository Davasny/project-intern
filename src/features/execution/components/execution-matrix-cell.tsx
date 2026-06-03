"use client"

import Link from "next/link"
import { RunStatusBadge } from "@/components/ui/status-badge/intern-run-status-badge"
import { WorkRecordStatusBadge } from "@/components/ui/status-badge/work-record-status-badge"
import { ExecutionMatrixCellAction } from "@/features/execution/components/execution-matrix-cell-action"
import { isFailedInternRunState } from "@/features/execution/lib/is-failed-intern-run-state"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"

type ExecutionMatrixCellProps = {
  debugControlsEnabled: boolean
  isAutopickEnabled: boolean
  organizationSlug: string
  projectSlug: string
  workRecord: {
    attemptCount: number
    latestInternRun: {
      id: string
      state: InternRunState
      statusTooltipText: string | null
    } | null
    recordId: string
    state: WorkRecordState
    workRecordId: string
  } | null
}

export const ExecutionMatrixCell = ({
  debugControlsEnabled,
  isAutopickEnabled,
  organizationSlug,
  projectSlug,
  workRecord,
}: ExecutionMatrixCellProps) => {
  if (!workRecord) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  if (workRecord.latestInternRun) {
    const labelSuffix =
      isFailedInternRunState(workRecord.latestInternRun.state) &&
      workRecord.attemptCount > 1
        ? `(${workRecord.attemptCount.toLocaleString()})`
        : null

    return (
      <div className="flex flex-row items-center gap-1.5">
        <Link
          className="inline-flex"
          href={`/app/${organizationSlug}/${projectSlug}/intern-runs/${workRecord.latestInternRun.id}`}
        >
          <RunStatusBadge
            labelSuffix={labelSuffix}
            state={workRecord.latestInternRun.state}
            tooltipText={workRecord.latestInternRun.statusTooltipText}
          />
        </Link>
        <ExecutionMatrixCellAction
          debugControlsEnabled={debugControlsEnabled}
          isAutopickEnabled={isAutopickEnabled}
          workRecord={workRecord}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center gap-1.5">
      <WorkRecordStatusBadge state={workRecord.state} />
      <ExecutionMatrixCellAction
        debugControlsEnabled={debugControlsEnabled}
        isAutopickEnabled={isAutopickEnabled}
        workRecord={workRecord}
      />
    </div>
  )
}
