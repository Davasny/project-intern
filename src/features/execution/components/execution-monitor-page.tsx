"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { Fragment, useState } from "react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
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

export const ExecutionMonitorPage = () => {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(
    () => new Set(),
  )
  const executionQuery = useExecutionMonitorQuery()

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
        </div>
        <PageHeaderActions>
          <ExecutionPageNavigation activePage="monitor" />
          <StatusBadge
            label={executionQuery.data.isAutopickEnabled ? "Autopick on" : "Autopick off"}
            tone={executionQuery.data.isAutopickEnabled ? "success" : "warning"}
          />
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
            Task records
          </h2>
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
                  <Fragment key={group.recordId}>
                    <TableRow
                      className="cursor-pointer bg-muted/50 hover:bg-muted/70"
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
                  </Fragment>
                )
              })}
            </TableBody>
          </DataTable>
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
