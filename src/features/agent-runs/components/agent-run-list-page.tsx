"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { DataTable } from "@/components/ui/data-table/data-table"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const AgentRunListPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const runsQuery = useQuery({
    ...trpc.agentRuns.list.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  })

  if (runsQuery.isLoading) {
    return <LoadingState label="Loading agent runs..." />
  }

  if (!runsQuery.data) {
    return <LoadingState label="Agent runs could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Agent runs
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete history of all agent run executions across tasks and
            records.
          </p>
        </div>
      </PageHeader>
      <DataTable>
        <TableHead>
          <TableRow>
            <TableHeader>State</TableHeader>
            <TableHeader>Provider</TableHeader>
            <TableHeader>Model</TableHeader>
            <TableHeader>Selected Agent</TableHeader>
            <TableHeader>Task</TableHeader>
            <TableHeader>Record</TableHeader>
            <TableHeader>Attempt</TableHeader>
            <TableHeader>Duration</TableHeader>
            <TableHeader>Tool Calls</TableHeader>
            <TableHeader>Tokens In</TableHeader>
            <TableHeader>Tokens Out</TableHeader>
            <TableHeader>Cost</TableHeader>
            <TableHeader>Started</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {runsQuery.data.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <Link
                  href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${run.id}`}
                >
                  <RunStatusBadge state={run.state} />
                </Link>
              </TableCell>
              <TableCell>{run.provider ?? "—"}</TableCell>
              <TableCell>{run.model ?? "—"}</TableCell>
              <TableCell>{run.selectedAgent ?? "—"}</TableCell>
              <TableCell>
                <Link
                  className="font-medium text-foreground hover:text-muted-foreground"
                  href={`/app/${organizationSlug}/${projectSlug}/tasks/${run.taskId}`}
                >
                  {run.taskTitle}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  className="font-medium text-foreground hover:text-muted-foreground"
                  href={`/app/${organizationSlug}/${projectSlug}/records/${run.recordId}`}
                >
                  {run.recordName}
                </Link>
              </TableCell>
              <TableCell>#{run.attemptNumber}</TableCell>
              <TableCell>
                {run.latencyMs !== null
                  ? `${(run.latencyMs / 1000).toFixed(1)}s`
                  : "—"}
              </TableCell>
              <TableCell>{run.taskCallCount}</TableCell>
              <TableCell>
                {run.inputTokens !== null
                  ? run.inputTokens.toLocaleString()
                  : run.tokenInput !== null
                    ? run.tokenInput.toLocaleString()
                    : "—"}
              </TableCell>
              <TableCell>
                {run.outputTokens !== null
                  ? run.outputTokens.toLocaleString()
                  : run.tokenOutput !== null
                    ? run.tokenOutput.toLocaleString()
                    : "—"}
              </TableCell>
              <TableCell>
                {run.costUsd !== null
                  ? `$${Number(run.costUsd).toFixed(4)}`
                  : run.estimatedCostUsd !== null
                    ? `~$${Number(run.estimatedCostUsd).toFixed(4)}`
                    : "—"}
              </TableCell>
              <TableCell>{run.startedAt?.toLocaleString() ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>
    </div>
  )
}
