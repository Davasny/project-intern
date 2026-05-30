"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { RecordStatusBadge } from "@/components/ui/status-badge/record-status-badge"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { Switch } from "@/components/ui/switch"
import { TableCell, TableRow } from "@/components/ui/table"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"
import { RecordContextValueCell } from "@/features/records/components/record-context-value-cell"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type RecordListRowProps = {
  record: {
    activeRun: {
      state: AgentRunState
    } | null
    id: string
    context: Record<string, unknown>
    name: string
    progress: {
      completedCount: number
      failedCount: number
      inProgressCount: number
      totalCount: number
      waitingCount: number
    }
    relationSummary: {
      activeCount: number
    }
    schemaVersion: number
    state: "active" | "archived" | "error" | "inactive" | "processing"
    updatedAt: Date
    version: number
  }
  contextColumns: ProjectSchemaField[]
  showContextValues: boolean
}

export const RecordListRow = ({
  contextColumns,
  record,
  showContextValues,
}: RecordListRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const listFilter = trpc.records.list.queryFilter({
    organizationSlug,
    projectSlug,
  })

  const activateMutation = useMutation(
    trpc.records.activate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(listFilter)
      },
    }),
  )

  const deactivateMutation = useMutation(
    trpc.records.deactivate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(listFilter)
      },
    }),
  )

  const handleActiveToggle = (checked: boolean) => {
    if (checked) {
      activateMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId: record.id,
      })
    } else {
      deactivateMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId: record.id,
      })
    }
  }

  const isTogglePending =
    activateMutation.isPending || deactivateMutation.isPending

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Link
            className="font-medium text-foreground hover:text-muted-foreground"
            href={`/app/${organizationSlug}/${projectSlug}/records/${record.id}`}
          >
            {record.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            Schema v{record.schemaVersion} · Record v{record.version}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <RecordStatusBadge state={record.state} />
          {record.state === "active" || record.state === "inactive" ? (
            <Switch
              checked={record.state === "active"}
              disabled={isTogglePending}
              onCheckedChange={handleActiveToggle}
            />
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {record.progress.completedCount}/{record.progress.totalCount} completed
      </TableCell>
      <TableCell>{record.progress.inProgressCount} active</TableCell>
      <TableCell>{record.progress.failedCount} failed</TableCell>
      <TableCell>{record.progress.waitingCount} waiting</TableCell>
      <TableCell>
        {record.activeRun ? (
          <RunStatusBadge state={record.activeRun.state} />
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>{record.relationSummary.activeCount} relations</TableCell>
      {showContextValues
        ? contextColumns.map((field) => (
            <RecordContextValueCell
              key={`${record.id}-${field.key}`}
              value={record.context[field.key]}
            />
          ))
        : null}
      <TableCell>{record.updatedAt.toLocaleString()}</TableCell>
    </TableRow>
  )
}
