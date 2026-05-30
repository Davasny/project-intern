"use client"

import { type DragEndEvent, closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ListTodoIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
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
import { ErrorState } from "@/components/ui/error-state/error-state"
import { FilterBar } from "@/components/ui/filter-bar/filter-bar"
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
  const queryClient = useQueryClient()
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const invalidateTaskQueries = async () => {
    await queryClient.invalidateQueries(
      trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
    )
    await queryClient.invalidateQueries(
      trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
    )
  }

  const previousOrderRef = useRef<string[]>([])

  const reorderMutation = useMutation(
    trpc.tasks.reorder.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(
          trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
        )
        const previous = queryClient.getQueryData(
          trpc.tasks.list.queryKey({ organizationSlug, projectSlug }),
        )
        if (previous) {
          type TaskData = (typeof previous)[number]
          const idMap = new Map(previous.map((t: TaskData) => [t.id, t]))
          const reordered = variables.input.orderedTaskIds
            .map((id: string) => idMap.get(id))
            .filter((t): t is TaskData => t !== undefined)
          queryClient.setQueryData(
            trpc.tasks.list.queryKey({ organizationSlug, projectSlug }),
            reordered,
          )
          previousOrderRef.current = previous.map((t: TaskData) => t.id)
        }
        return { previous }
      },
      onSuccess: (_data, variables) => {
        const taskCount = variables.input.orderedTaskIds.length
        toast("Tasks reordered", {
          action: {
            label: "Undo",
            onClick: async () => {
              if (previousOrderRef.current.length > 0) {
                await reorderMutation.mutateAsync({
                  input: { orderedTaskIds: previousOrderRef.current },
                  organizationSlug,
                  projectSlug,
                })
              }
            },
          },
          description:
            `${taskCount} tasks updated. Existing task-record execution states are preserved — completed tasks will not re-run automatically. To re-execute downstream tasks after inserting a task mid-pipeline, use the Reset downstream action on that task.`,
          duration: 8000,
        })
      },
      onError: (_error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.tasks.list.queryKey({ organizationSlug, projectSlug }),
            context.previous,
          )
        }
        toast.error("Failed to reorder tasks.")
      },
      onSettled: invalidateTaskQueries,
    }),
  )

  if (schemaVersionsQuery.isLoading || tasksQuery.isLoading) {
    return <LoadingState label="Loading task queue..." variant="table" />
  }

  if (!schemaVersionsQuery.data || !tasksQuery.data) {
    return (
      <ErrorState
        message="The task queue could not be loaded. Please try again."
        title="Failed to load tasks"
      />
    )
  }

  const schemaVersionOptions = schemaVersionsQuery.data.map(
    (version) => version.version,
  )
  const latestSchemaVersion = schemaVersionOptions[0] ?? 1
  const taskIds = tasksQuery.data.map((task) => task.id)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = taskIds.indexOf(active.id as string)
    const newIndex = taskIds.indexOf(over.id as string)
    const newOrder = arrayMove(taskIds, oldIndex, newIndex)
    await reorderMutation.mutateAsync({
      input: { orderedTaskIds: newOrder },
      organizationSlug,
      projectSlug,
    })
  }

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

        {tasksQuery.data.length > 0 ? (
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader className="w-10" />
                <TableHeader>Order</TableHeader>
                <TableHeader>Task</TableHeader>
                <TableHeader>Temperature</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Completed</TableHeader>
                <TableHeader>Active</TableHeader>
                <TableHeader>Failed</TableHeader>
                <TableHeader>Waiting</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={taskIds}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {tasksQuery.data.map((task) => (
                    <TaskListRow key={task.id} task={task} />
                  ))}
                </TableBody>
              </SortableContext>
            </DndContext>
          </DataTable>
        ) : (
          <DataTableEmptyState
            action={
              <Button onClick={() => setIsCreateOpen(true)} type="button">
                Create first task
              </Button>
            }
            description="Create the first project task to fan out task records across every current record."
            icon={<ListTodoIcon />}
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
            initialTemperature={null}
            initialSchemaVersion={latestSchemaVersion}
            initialTitle=""
            onSubmitted={() => setIsCreateOpen(false)}
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
