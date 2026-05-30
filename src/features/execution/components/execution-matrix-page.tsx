"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCwIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { ExecutionMatrixSection } from "@/features/execution/components/execution-matrix-section"
import { ExecutionSummaryStrip } from "@/features/execution/components/execution-summary-strip"
import { useExecutionMonitorQuery } from "@/features/execution/hooks/use-execution-monitor-query"
import { buildExecutionMatrix } from "@/features/execution/lib/build-execution-matrix"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { RecordForm } from "@/features/records/components/record-form"
import { TaskForm } from "@/features/tasks/components/task-form"
import { useTRPC } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

export const ExecutionMatrixPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const executionQuery = useExecutionMonitorQuery()
  const [isCreateRecordOpen, setIsCreateRecordOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)

  const initialSchemaQuery = useQuery(
    trpc.projectSchema.getByVersion.queryOptions({
      organizationSlug,
      projectSlug,
      version: 1,
    }),
  )

  const schemaVersionsQuery = useQuery(
    trpc.projectSchema.listVersions.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  const tasksQuery = useQuery(
    trpc.tasks.list.queryOptions({ organizationSlug, projectSlug }),
  )

  if (executionQuery.isLoading) {
    return <LoadingState label="Loading execution matrix..." />
  }

  if (!executionQuery.data) {
    return <LoadingState label="Execution matrix could not be loaded." />
  }

  const matrix = buildExecutionMatrix(executionQuery.data.taskRecords)

  const invalidateMonitor = async () => {
    await queryClient.invalidateQueries(
      trpc.execution.getMonitor.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
  }

  const handleRecordCreated = async () => {
    setIsCreateRecordOpen(false)
    await invalidateMonitor()
  }

  const handleTaskCreated = async () => {
    setIsCreateTaskOpen(false)
    await invalidateMonitor()
  }

  const schemaVersionOptions = schemaVersionsQuery.data
    ? schemaVersionsQuery.data.map((version) => version.version)
    : []

  const latestSchemaVersion = schemaVersionOptions[0] ?? 1

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Record-by-task execution grid with latest run results, queue
                summary, and controls.
              </p>
            </div>
            <div className="flex flex-row gap-2">
              <Button
                disabled={executionQuery.isFetching}
                onClick={invalidateMonitor}
                size="icon"
                variant="outline"
              >
                <RefreshCwIcon
                  className={cn(
                    "size-4",
                    executionQuery.isFetching ? "animate-spin" : "",
                  )}
                />
                <span className="sr-only">Refresh Dashboard</span>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href={`/app/${organizationSlug}/${projectSlug}/settings`}>
                  <SettingsIcon className="size-4" />
                  <span className="sr-only">Project Settings</span>
                </Link>
              </Button>
            </div>
          </div>
        </PageHeader>

        <ExecutionSummaryStrip
          isAutopickEnabled={executionQuery.data.isAutopickEnabled}
          summary={executionQuery.data.summary}
        />
        <ExecutionMatrixSection
          debugControlsEnabled={executionQuery.data.debugControlsEnabled}
          isAutopickEnabled={executionQuery.data.isAutopickEnabled}
          matrix={matrix}
          onAddRecord={() => setIsCreateRecordOpen(true)}
          onAddTask={() => setIsCreateTaskOpen(true)}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      </div>

      <Dialog
        onOpenChange={setIsCreateRecordOpen}
        open={isCreateRecordOpen}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create record</DialogTitle>
            <DialogDescription>
              New records start inactive. Activate them from the record detail
              page to begin task processing.
            </DialogDescription>
          </DialogHeader>
          {initialSchemaQuery.data ? (
            <RecordForm
              initialContext={{}}
              initialName=""
              key={initialSchemaQuery.data.id}
              onSubmitted={handleRecordCreated}
              recordId={null}
              recordVersion={null}
              schemaDefinition={initialSchemaQuery.data.schemaDefinition}
            />
          ) : (
            <LoadingState label="Loading schema..." />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setIsCreateTaskOpen}
        open={isCreateTaskOpen}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>
              New tasks fan out task-record rows to every current record.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            initialDescriptionMarkdown=""
            initialModel={null}
            initialTemperature={null}
            initialSchemaVersion={latestSchemaVersion}
            initialTitle=""
            onSubmitted={handleTaskCreated}
            schemaVersionOptions={
              schemaVersionOptions.length > 0 ? schemaVersionOptions : [1]
            }
            taskId={null}
            tasks={tasksQuery.data ?? []}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
