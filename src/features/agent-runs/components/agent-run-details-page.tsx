"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { StatsBar } from "@/components/ui/stats-bar/stats-bar"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AgentRunMessages } from "@/features/agent-runs/components/agent-run-messages"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type AgentRunDetailsPageProps = {
  agentRunId: string
}

export const AgentRunDetailsPage = ({
  agentRunId,
}: AgentRunDetailsPageProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const runQuery = useQuery({
    ...trpc.agentRuns.getById.queryOptions({
      agentRunId,
      organizationSlug,
      projectSlug,
    }),
  })

  if (runQuery.isLoading) {
    return <LoadingState label="Loading agent run..." />
  }

  if (!runQuery.data) {
    return <LoadingState label="Agent run could not be loaded." />
  }

  const run = runQuery.data
  const durationMs = run.latencyMs
  const durationDisplay =
    durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : "—"

  const totalTokens =
    (run.inputTokens ?? run.tokenInput ?? 0) +
    (run.outputTokens ?? run.tokenOutput ?? 0)

  const stats = [
    { label: "Model", value: run.selectedModel ?? run.model ?? "—" },
    { label: "Agent", value: run.selectedAgent ?? "—" },
    { label: "Duration", value: durationDisplay },
    { label: "Tokens", value: totalTokens.toLocaleString() },
    { label: "Tool Calls", value: run.taskCallCount },
    {
      label: "Cost",
      value: run.costUsd !== null ? `$${Number(run.costUsd).toFixed(4)}` : "—",
    },
    { label: "Attempt", value: `#${run.attemptNumber}` },
  ]

  const details = [
    [
      { label: "Provider", value: run.provider ?? "—" },
      { label: "Model", value: run.model ?? "—" },
      { label: "Selected Model", value: run.selectedModel ?? "—" },
      { label: "Selected Agent", value: run.selectedAgent ?? "—" },
    ],
    [
      { label: "Session Reference", value: run.sessionReference ?? "—" },
      { label: "Directory", value: run.directory ?? "—" },
    ],
    [
      { label: "Started", value: run.startedAt?.toLocaleString() ?? "—" },
      { label: "Finished", value: run.finishedAt?.toLocaleString() ?? "—" },
      { label: "Duration", value: durationDisplay },
    ],
    [
      {
        label: "Token Input",
        value:
          run.inputTokens !== null
            ? run.inputTokens.toLocaleString()
            : run.tokenInput !== null
              ? run.tokenInput.toLocaleString()
              : "—",
      },
      {
        label: "Token Output",
        value:
          run.outputTokens !== null
            ? run.outputTokens.toLocaleString()
            : run.tokenOutput !== null
              ? run.tokenOutput.toLocaleString()
              : "—",
      },
      { label: "Tool Calls", value: run.taskCallCount.toString() },
    ],
    [
      {
        label: "Estimated Cost",
        value:
          run.estimatedCostUsd !== null
            ? `$${Number(run.estimatedCostUsd).toFixed(6)}`
            : "—",
      },
      {
        label: "Actual Cost",
        value:
          run.costUsd !== null ? `$${Number(run.costUsd).toFixed(6)}` : "—",
      },
    ],
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Agent Run
              </h1>
              <RunStatusBadge state={run.state} />
            </div>
            <p className="text-sm text-muted-foreground">
              Attempt #{run.attemptNumber} for task &quot;{run.taskTitle}&quot;
              on record &quot;{run.recordName}&quot;
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link
                href={`/app/${organizationSlug}/${projectSlug}/execution/runs`}
              >
                Back to runs
              </Link>
            </Button>
          </div>
        </div>
      </PageHeader>
      <StatsBar stats={stats} details={details} />
      {run.taskActivitySummary &&
        Object.keys(run.taskActivitySummary).length > 0 && (
          <SectionCard>
            <SectionCardHeader>
              <h2 className="text-lg font-semibold text-foreground">
                Tool Activity Summary
              </h2>
            </SectionCardHeader>
            <SectionCardContent>
              <JsonViewer value={run.taskActivitySummary} />
            </SectionCardContent>
          </SectionCard>
        )}
      {run.toolSummary && Object.keys(run.toolSummary).length > 0 && (
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Tool Summary
            </h2>
          </SectionCardHeader>
          <SectionCardContent>
            <JsonViewer value={run.toolSummary} />
          </SectionCardContent>
        </SectionCard>
      )}
      {run.resultPayload && (
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Result Payload
            </h2>
          </SectionCardHeader>
          <SectionCardContent>
            <JsonViewer value={run.resultPayload} />
          </SectionCardContent>
        </SectionCard>
      )}
      {run.failurePayload && (
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Failure Payload
            </h2>
          </SectionCardHeader>

          <SectionCardContent>
            <JsonViewer value={run.failurePayload} />
          </SectionCardContent>
        </SectionCard>
      )}
      {run.siblingRuns.length > 1 && (
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Previous Attempts
            </h2>
          </SectionCardHeader>
          <SectionCardContent>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableHeader>Attempt</TableHeader>
                  <TableHeader>State</TableHeader>
                  <TableHeader>Created</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {run.siblingRuns.map((sibling) => (
                  <TableRow key={sibling.id}>
                    <TableCell>#{sibling.attemptNumber}</TableCell>
                    <TableCell>
                      {sibling.id === agentRunId ? (
                        <RunStatusBadge state={sibling.state} />
                      ) : (
                        <Link
                          href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${sibling.id}`}
                        >
                          <RunStatusBadge state={sibling.state} />
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>{sibling.createdAt.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          </SectionCardContent>
        </SectionCard>
      )}
      <AgentRunMessages agentRunId={agentRunId} />
    </div>
  )
}
