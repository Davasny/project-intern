import type { OpencodeClient } from "@opencode-ai/sdk"
import type { Logger } from "pino"
import { updateInternRunMetrics } from "@/features/intern-runs/lib/update-intern-run-metrics"
import { getSessionMetrics } from "@/features/opencode/lib/get-session-metrics"

export type SyncSessionMetricsTrigger =
  | "final_finish"
  | "manual"
  | "poll_tick"
  | "post_transition"
  | "terminal_state"
  | "timeout"

export type SyncSessionMetricsToInternRunResult =
  | { reason: "synced"; synced: true }
  | { reason: "no_metrics"; synced: false }
  | { reason: "no_refreshable_metrics"; synced: false }
  | { reason: "failed"; synced: false }

const hasRefreshableMetrics = ({
  costUsd,
  inputTokens,
  latencyMs,
  outputTokens,
  toolCallCount,
}: {
  costUsd: number | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  toolCallCount: number
}) =>
  costUsd !== null ||
  inputTokens !== null ||
  latencyMs !== null ||
  outputTokens !== null ||
  toolCallCount > 0

export const syncSessionMetricsToInternRun = async ({
  client,
  directory,
  fallbackLatencyMs,
  internRunId,
  log,
  sessionId,
  trigger,
}: {
  client: OpencodeClient
  directory: string | null
  fallbackLatencyMs: number | null
  internRunId: string
  log: Logger
  sessionId: string
  trigger: SyncSessionMetricsTrigger
}): Promise<SyncSessionMetricsToInternRunResult> => {
  try {
    const metrics = await getSessionMetrics({
      client,
      directory,
      fallbackLatencyMs,
      sessionId,
    })

    if (!metrics) {
      log.debug({ trigger }, "Skipped intern run metrics sync: no metrics")
      return { reason: "no_metrics", synced: false }
    }

    if (!hasRefreshableMetrics(metrics)) {
      log.debug(
        { trigger },
        "Skipped intern run metrics sync: no refreshable metrics",
      )
      return { reason: "no_refreshable_metrics", synced: false }
    }

    await updateInternRunMetrics({
      internRunId,
      costUsd: metrics.costUsd,
      inputTokens: metrics.inputTokens,
      latencyMs: metrics.latencyMs,
      outputTokens: metrics.outputTokens,
      toolCallCount: metrics.toolCallCount,
    })

    log.info(
      {
        costUsd: metrics.costUsd,
        inputTokens: metrics.inputTokens,
        latencyMs: metrics.latencyMs,
        outputTokens: metrics.outputTokens,
        toolCallCount: metrics.toolCallCount,
        trigger,
      },
      "Synced intern run metrics from OpenCode session",
    )

    return { reason: "synced", synced: true }
  } catch (error) {
    log.warn(
      {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        trigger,
      },
      "Failed to sync intern run metrics from OpenCode session",
    )

    return { reason: "failed", synced: false }
  }
}
