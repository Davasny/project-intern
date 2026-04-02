"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DataTable } from "@/components/ui/data-table/data-table"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { Switch } from "@/components/ui/switch"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExecutionMonitorRow } from "@/features/execution/components/execution-monitor-row"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const ExecutionMonitorPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const executionQuery = useQuery({
    ...trpc.execution.getMonitor.queryOptions({
      organizationSlug,
      projectSlug,
    }),
    refetchInterval: (query) => {
      const data = query.state.data
      return data && data.summary.activeCount > 0 ? 3000 : false
    },
  })
  const toggleAutopickMutation = useMutation(
    trpc.execution.updateAutopick.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.execution.getMonitor.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )

  if (executionQuery.isLoading) {
    return <LoadingState label="Loading execution monitor..." />
  }

  if (!executionQuery.data) {
    return <LoadingState label="Execution monitor could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Execution monitor
          </h1>
          <p className="text-sm text-slate-500">
            Queue-backed task-record execution, retries, and development
            controls.
          </p>
        </div>
        {executionQuery.data.debugControlsEnabled ? (
          <PageHeaderActions>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
              <span>Autopick</span>
              <Switch
                checked={executionQuery.data.isAutopickEnabled}
                disabled={toggleAutopickMutation.isPending}
                onCheckedChange={(isAutopickEnabled) =>
                  toggleAutopickMutation.mutate({
                    isAutopickEnabled,
                    organizationSlug,
                    projectSlug,
                  })
                }
              />
            </div>
          </PageHeaderActions>
        ) : null}
      </PageHeader>
      <ProgressMetricGrid>
        <ProgressMetric
          label="Waiting"
          value={executionQuery.data.summary.waitingCount}
        />
        <ProgressMetric
          label="Active"
          value={executionQuery.data.summary.activeCount}
        />
        <ProgressMetric
          label="Failed"
          value={executionQuery.data.summary.failedCount}
        />
        <ProgressMetric
          label="Retried"
          value={executionQuery.data.summary.retriedCount}
        />
      </ProgressMetricGrid>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-slate-950">
            Debug controls
          </h2>
          <p className="text-sm text-slate-500">
            Autopick is currently{" "}
            {executionQuery.data.isAutopickEnabled ? "enabled" : "disabled"}.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <p className="text-sm text-slate-500">
            Manual task-record triggering appears only in development when
            autopick is disabled.
          </p>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-slate-950">
            Task-record executions
          </h2>
          <p className="text-sm text-slate-500">
            Live persisted processing state with retry counts and latest run
            status.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader>Order</TableHeader>
                <TableHeader>Task / record</TableHeader>
                <TableHeader>Task record</TableHeader>
                <TableHeader>Latest run</TableHeader>
                <TableHeader>Attempts</TableHeader>
                <TableHeader>Last transition</TableHeader>
                <TableHeader>Debug</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {executionQuery.data.taskRecords.map((taskRecord) => (
                <ExecutionMonitorRow
                  debugControlsEnabled={
                    executionQuery.data.debugControlsEnabled
                  }
                  isAutopickEnabled={executionQuery.data.isAutopickEnabled}
                  key={taskRecord.taskRecordId}
                  taskRecord={taskRecord}
                />
              ))}
            </TableBody>
          </DataTable>
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
