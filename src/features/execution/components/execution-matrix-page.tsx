"use client"

import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { ExecutionMatrixSection } from "@/features/execution/components/execution-matrix-section"
import { ExecutionSummaryStrip } from "@/features/execution/components/execution-summary-strip"
import { useExecutionMonitorQuery } from "@/features/execution/hooks/use-execution-monitor-query"
import { buildExecutionMatrix } from "@/features/execution/lib/build-execution-matrix"
import { useProjectScope } from "@/features/projects/context/project-scope-context"

export const ExecutionMatrixPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const executionQuery = useExecutionMonitorQuery()

  if (executionQuery.isLoading) {
    return <LoadingState label="Loading execution matrix..." />
  }

  if (!executionQuery.data) {
    return <LoadingState label="Execution matrix could not be loaded." />
  }

  const matrix = buildExecutionMatrix(executionQuery.data.taskRecords)

  return (
    <div className="flex flex-col gap-6">
        <PageHeader>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Record-by-task execution grid with latest run results, queue
              summary, and controls.
            </p>
          </div>
        </PageHeader>

      <ExecutionSummaryStrip summary={executionQuery.data.summary} />
      <ExecutionMatrixSection
        debugControlsEnabled={executionQuery.data.debugControlsEnabled}
        isAutopickEnabled={executionQuery.data.isAutopickEnabled}
        matrix={matrix}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
      />
    </div>
  )
}
