"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { StatsBar } from "@/components/ui/stats-bar/stats-bar"
import { RunStatusBadge } from "@/components/ui/status-badge/intern-run-status-badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InternRunMessages } from "@/features/intern-runs/components/intern-run-messages"
import { InternRunOpencodeExportButton } from "@/features/intern-runs/components/intern-run-opencode-export-button"
import { InternRunPayloadCard } from "@/features/intern-runs/components/intern-run-payload-card"
import { InternRunRefreshStatsButton } from "@/features/intern-runs/components/intern-run-refresh-stats-button"
import { InternRunSummaryReasonCard } from "@/features/intern-runs/components/intern-run-summary-reason-card"
import { getInternRunOutcomeDetails } from "@/features/intern-runs/lib/get-intern-run-outcome-details"
import { isInternRunStateActive } from "@/features/intern-runs/schemas/intern-run-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"
import { formatDurationMs } from "@/utils/format-duration-ms"

type InternRunDetailsPageProps = {
  anchorInternRunId: string
  attemptNumber: number
}

type InternRunTokenMetrics = {
  cachedInputTokens: number | null
  inputTokens: number | null
  outputTokens: number | null
  tokenInput: number | null
  tokenOutput: number | null
}

type InternRunCostMetrics = {
  costUsd: string | null
  estimatedCostUsd: string | null
}

const formatInternRunTokenTotal = ({
  cachedInputTokens,
  inputTokens,
  outputTokens,
  tokenInput,
  tokenOutput,
}: InternRunTokenMetrics) => {
  const tokensIn = inputTokens ?? tokenInput
  const tokensOut = outputTokens ?? tokenOutput
  const tokensCached = cachedInputTokens ?? 0

  if (tokensIn === null && tokensOut === null && tokensCached === 0) {
    return "—"
  }

  return ((tokensIn ?? 0) + (tokensOut ?? 0) + tokensCached).toLocaleString()
}

const formatInternRunCost = ({
  costUsd,
  estimatedCostUsd,
}: InternRunCostMetrics) => {
  if (costUsd !== null) {
    return `$${Number(costUsd).toFixed(4)}`
  }

  return estimatedCostUsd !== null
    ? `~$${Number(estimatedCostUsd).toFixed(4)}`
    : "—"
}

export const InternRunDetailsPage = ({
  anchorInternRunId,
  attemptNumber,
}: InternRunDetailsPageProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const runQuery = useQuery({
    ...trpc.internRuns.getAttempt.queryOptions({
      internRunId: anchorInternRunId,
      attemptNumber,
      organizationSlug,
      projectSlug,
    }),
    refetchInterval: (query) => {
      const data = query.state.data
      return data && isInternRunStateActive(data.state) ? 3000 : false
    },
  })

  const abortMutation = useMutation(
    trpc.internRuns.abort.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.internRuns.getAttempt.queryFilter({
            internRunId: anchorInternRunId,
            attemptNumber,
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )

  if (runQuery.isLoading) {
    return <LoadingState label="Loading intern run..." />
  }

  if (!runQuery.data) {
    return <LoadingState label="Intern run could not be loaded." />
  }

  const run = runQuery.data
  const durationDisplay = formatDurationMs(run.durationMs)
  const outcomeDetails = getInternRunOutcomeDetails({
    failurePayload: run.failurePayload,
    resultPayload: run.resultPayload,
  })

  const totalTokens =
    (run.inputTokens ?? run.tokenInput ?? 0) +
    (run.outputTokens ?? run.tokenOutput ?? 0) +
    (run.cachedInputTokens ?? 0)

  const stats = [
    { label: "Model", value: run.selectedModel ?? run.model ?? "—" },
    {
      label: "Temperature",
      value:
        run.selectedTemperature !== null
          ? run.selectedTemperature.toFixed(1)
          : "—",
    },
    { label: "Intern", value: run.selectedIntern ?? "—" },
    { label: "Duration", value: durationDisplay },
    {
      label: "Input Tokens",
      value: (run.inputTokens ?? run.tokenInput ?? 0).toLocaleString(),
    },
    {
      label: "Cached Tokens",
      value: (run.cachedInputTokens ?? 0).toLocaleString(),
    },
    {
      label: "Output Tokens",
      value: (run.outputTokens ?? run.tokenOutput ?? 0).toLocaleString(),
    },
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
      {
        label: "Selected Temperature",
        value:
          run.selectedTemperature !== null
            ? run.selectedTemperature.toFixed(1)
            : "—",
      },
      { label: "Selected Intern", value: run.selectedIntern ?? "—" },
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
      { label: "Total Tokens", value: totalTokens.toLocaleString() },
      {
        label: "Cached Input",
        value: run.cachedInputTokens?.toLocaleString() ?? "—",
      },
      {
        label: "Cache Write",
        value: run.cacheWriteTokens?.toLocaleString() ?? "—",
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

  const handleKill = async () => {
    try {
      await abortMutation.mutateAsync({
        internRunId: run.id,
        organizationSlug,
        projectSlug,
      })
    } catch {
      // error handled via mutation state
    }
  }

  const isAbortable = isInternRunStateActive(run.state)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Intern Run
              </h1>
              <RunStatusBadge
                labelSuffix={null}
                state={run.state}
                tooltipText={run.statusTooltipText}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Attempt #{run.attemptNumber} for task{" "}
              <Link
                className="font-medium text-foreground hover:text-muted-foreground"
                href={`/app/${organizationSlug}/${projectSlug}/tasks/${run.taskId}`}
              >
                &quot;{run.taskTitle}&quot;
              </Link>{" "}
              on record{" "}
              <Link
                className="font-medium text-foreground hover:text-muted-foreground"
                href={`/app/${organizationSlug}/${projectSlug}/records/${run.recordId}`}
              >
                &quot;{run.recordName}&quot;
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InternRunOpencodeExportButton
              internRunId={run.id}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              sessionReference={run.sessionReference}
            />
            <InternRunRefreshStatsButton
              attemptNumber={run.attemptNumber}
              internRunId={run.id}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              queryInternRunId={anchorInternRunId}
            />
            {isAbortable ? (
              <Button
                disabled={abortMutation.isPending}
                onClick={handleKill}
                type="button"
                variant="destructive"
              >
                {abortMutation.isPending ? "Stopping..." : "Kill"}
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link
                href={`/app/${organizationSlug}/${projectSlug}/intern-runs`}
              >
                Back to runs
              </Link>
            </Button>
          </div>
        </div>
      </PageHeader>
      <StatsBar stats={stats} details={details} />
      {outcomeDetails !== null ? (
        <InternRunSummaryReasonCard details={outcomeDetails} />
      ) : null}
      {run.resultPayload ? (
        <InternRunPayloadCard payload={run.resultPayload} title="Result Payload" />
      ) : null}
      {run.failurePayload ? (
        <InternRunPayloadCard payload={run.failurePayload} title="Failure Payload" />
      ) : null}
      {run.siblingRuns.length > 1 ? (
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
                  <TableHeader>Duration</TableHeader>
                  <TableHeader>Tokens</TableHeader>
                  <TableHeader>Cost</TableHeader>
                  <TableHeader>Created</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {run.siblingRuns.map((sibling) => (
                  <TableRow key={sibling.id}>
                    <TableCell>#{sibling.attemptNumber}</TableCell>
                    <TableCell>
                      {sibling.id === run.id ? (
                        <RunStatusBadge
                          labelSuffix={null}
                          state={sibling.state}
                          tooltipText={sibling.statusTooltipText}
                        />
                      ) : (
                        <Link
                          href={`/app/${organizationSlug}/${projectSlug}/intern-runs/${anchorInternRunId}/attempts/${String(sibling.attemptNumber)}`}
                        >
                          <RunStatusBadge
                            labelSuffix={null}
                            state={sibling.state}
                            tooltipText={sibling.statusTooltipText}
                          />
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>{formatDurationMs(sibling.durationMs)}</TableCell>
                    <TableCell>
                      {formatInternRunTokenTotal({
                        cachedInputTokens: sibling.cachedInputTokens,
                        inputTokens: sibling.inputTokens,
                        outputTokens: sibling.outputTokens,
                        tokenInput: sibling.tokenInput,
                        tokenOutput: sibling.tokenOutput,
                      })}
                    </TableCell>
                    <TableCell>
                      {formatInternRunCost({
                        costUsd: sibling.costUsd,
                        estimatedCostUsd: sibling.estimatedCostUsd,
                      })}
                    </TableCell>
                    <TableCell>{sibling.createdAt.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          </SectionCardContent>
        </SectionCard>
      ) : null}
      <InternRunMessages
        internRunId={run.id}
        isRunActive={isInternRunStateActive(run.state)}
      />
    </div>
  )
}
