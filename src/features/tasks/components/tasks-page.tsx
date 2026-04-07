"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableEmptyState } from "@/components/ui/data-table/data-table-empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FilterBar } from "@/components/ui/filter-bar/filter-bar"
import { FilterBarActions } from "@/components/ui/filter-bar/filter-bar-actions"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { TaskForm } from "@/features/tasks/components/task-form"
import { TaskListRow } from "@/features/tasks/components/task-list-row"
import { useTRPC } from "@/lib/trpc/client"

export const TasksPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const schemaVersionsQuery = useQuery(
    trpc.projectSchema.listVersions.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )
  const tasksQuery = useQuery(
    trpc.tasks.list.queryOptions({ organizationSlug, projectSlug }),
  )

  if (schemaVersionsQuery.isLoading || tasksQuery.isLoading) {
    return <LoadingState label="Loading task queue..." />
  }

  if (!schemaVersionsQuery.data || !tasksQuery.data) {
    return <LoadingState label="Task queue could not be loaded." />
  }

  const schemaVersionOptions = schemaVersionsQuery.data.map(
    (version) => version.version,
  )
  const latestSchemaVersion = schemaVersionOptions[0] ?? 1

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Tasks
            </h1>
            <p className="text-sm text-muted-foreground">
              Ordered project-scoped work contracts with per-record execution
              state.
            </p>
          </div>
          <PageHeaderActions>
            <Button onClick={() => setIsCreateOpen(true)} type="button">
              New task
            </Button>
          </PageHeaderActions>
        </PageHeader>
        <FilterBar>
          <div className="text-sm text-muted-foreground">
            {tasksQuery.data.length} tasks ordered for this project queue.
          </div>
          <FilterBarActions>
            <Button
              onClick={() => setIsCreateOpen(true)}
              type="button"
              variant="secondary"
            >
              Create task
            </Button>
          </FilterBarActions>
        </FilterBar>
        {tasksQuery.data.length > 0 ? (
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader>Order</TableHeader>
                <TableHeader>Task</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Completed</TableHeader>
                <TableHeader>Active</TableHeader>
                <TableHeader>Failed</TableHeader>
                <TableHeader>Waiting</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasksQuery.data.map((task) => (
                <TaskListRow key={task.id} task={task} />
              ))}
            </TableBody>
          </DataTable>
        ) : (
          <DataTableEmptyState
            action={
              <Button onClick={() => setIsCreateOpen(true)} type="button">
                Create first task
              </Button>
            }
            description="Create the first project task to fan out task records across every current record."
            title="No tasks yet"
          />
        )}
      </div>
      <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
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
            initialSchemaVersion={latestSchemaVersion}
            initialTitle=""
            onSubmitted={() => setIsCreateOpen(false)}
            schemaVersionOptions={
              schemaVersionOptions.length > 0 ? schemaVersionOptions : [1]
            }
            taskId={null}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
