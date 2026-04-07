"use client"

import { DataTable } from "@/components/ui/data-table/data-table"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExecutionMatrixRecordRow } from "@/features/execution/components/execution-matrix-record-row"
import { ExecutionPageNavigation } from "@/features/execution/components/execution-page-navigation"
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
            Execution matrix
          </h1>
          <p className="text-sm text-muted-foreground">
            Record-by-task grid with the latest task-record run result in each
            cell.
          </p>
        </div>
        <PageHeaderActions>
          <ExecutionPageNavigation activePage="matrix" />
        </PageHeaderActions>
      </PageHeader>

      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Task-record matrix
          </h2>
          <p className="text-sm text-muted-foreground">
            Rows are records, columns are tasks ordered by task order.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader className="sticky left-0 z-20 min-w-56 bg-muted">
                  Record
                </TableHeader>
                {matrix.tasks.map((task) => (
                  <TableHeader
                    className="min-w-40 whitespace-normal break-words text-xs normal-case tracking-normal"
                    key={task.id}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">
                        {task.title}
                      </span>
                      <span className="text-muted-foreground">
                        #{task.sortOrder}
                      </span>
                    </div>
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.records.length > 0 ? (
                matrix.records.map((record) => (
                  <ExecutionMatrixRecordRow
                    key={record.id}
                    organizationSlug={organizationSlug}
                    projectSlug={projectSlug}
                    record={record}
                    recordCells={matrix.taskRecordsByRecordId.get(record.id) ?? null}
                    tasks={matrix.tasks}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="text-sm text-muted-foreground"
                    colSpan={Math.max(matrix.tasks.length + 1, 2)}
                  >
                    No task-record executions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </DataTable>
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
