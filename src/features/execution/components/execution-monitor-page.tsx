"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExecutionMonitorRow } from "@/features/execution/components/execution-monitor-row"
import { ExecutionPageNavigation } from "@/features/execution/components/execution-page-navigation"
import { useExecutionMonitorQuery } from "@/features/execution/hooks/use-execution-monitor-query"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const ExecutionMonitorPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(
    () => new Set(),
  )
  const executionQuery = useExecutionMonitorQuery()
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

  if (!executionQuery.data) {
    return <LoadingState label="Execution monitor could not be loaded." />
  }

  const groups = new Map<
    string,
    {
      recordId: string
      recordName: string
      taskRecords: (typeof executionQuery.data.taskRecords)[number][]
    }
  >()
  for (const taskRecord of executionQuery.data.taskRecords) {
    const existing = groups.get(taskRecord.recordId)
    if (existing) {
      existing.taskRecords.push(taskRecord)
    } else {
      groups.set(taskRecord.recordId, {
        recordId: taskRecord.recordId,
        recordName: taskRecord.recordName,
        taskRecords: [taskRecord],
      })
    }
  }
  const groupedTaskRecords = Array.from(groups.values())

  const toggleRecord = (recordId: string) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev)
      if (next.has(recordId)) {
        next.delete(recordId)
      } else {
        next.add(recordId)
      }
      return next
    })
  }

  if (executionQuery.isLoading) {
    return <LoadingState label="Loading execution monitor..." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Execution monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Queue-backed task-record execution, retries, and development
            controls.
          </p>
        </div>
        <PageHeaderActions>
          <ExecutionPageNavigation activePage="monitor" />
          {executionQuery.data.debugControlsEnabled ? (
            <Card className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted-foreground">
              <span>Autopick</span>
              <Switch
                checked={executionQuery.data.isAutopickEnabled}
                disabled={toggleAutopickMutation.isPending}
                onCheckedChange={async (isAutopickEnabled) => {
                  try {
                    await toggleAutopickMutation.mutateAsync({
                      isAutopickEnabled,
                      organizationSlug,
                      projectSlug,
                    })
                  } catch (error) {
                    console.error("Failed to toggle autopick:", error)
                  }
                }}
              />
            </Card>
          ) : null}
        </PageHeaderActions>
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
          <h2 className="text-lg font-semibold text-foreground">
            Debug controls
          </h2>
          <p className="text-sm text-muted-foreground">
            Autopick is currently{" "}
            {executionQuery.data.isAutopickEnabled ? "enabled" : "disabled"}.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <p className="text-sm text-muted-foreground">
            Manual task-record triggering appears only in development when
            autopick is disabled.
          </p>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Task-record executions
          </h2>
          <p className="text-sm text-muted-foreground">
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
              {groupedTaskRecords.map((group) => {
                const isExpanded = expandedRecords.has(group.recordId)
                return (
                  <>
                    <TableRow
                      className="cursor-pointer bg-muted/50 hover:bg-muted/70"
                      key={`group-${group.recordId}`}
                      onClick={() => toggleRecord(group.recordId)}
                    >
                      <TableCell className="font-medium" colSpan={7}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>{group.recordName}</span>
                          <span className="text-sm text-muted-foreground">
                            ({group.taskRecords.length} task
                            {group.taskRecords.length !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded
                      ? group.taskRecords.map((taskRecord) => (
                          <ExecutionMonitorRow
                            debugControlsEnabled={
                              executionQuery.data.debugControlsEnabled
                            }
                            isAutopickEnabled={
                              executionQuery.data.isAutopickEnabled
                            }
                            key={taskRecord.taskRecordId}
                            taskRecord={taskRecord}
                          />
                        ))
                      : null}
                  </>
                )
              })}
            </TableBody>
          </DataTable>
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
