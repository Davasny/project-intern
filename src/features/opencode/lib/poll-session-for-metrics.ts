import type { OpencodeClient } from "@opencode-ai/sdk"
import { eq } from "drizzle-orm"
import type pino from "pino"
import { internRunTable } from "@/features/intern-runs/db"
import { failInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { updateInternRunMetrics } from "@/features/intern-runs/lib/update-intern-run-metrics"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import { isInternRunStateActive } from "@/features/intern-runs/schemas/intern-run-state"
import { getSessionMetrics } from "@/features/opencode/lib/get-session-metrics"
import { isAssistantSessionMessage } from "@/features/opencode/lib/is-assistant-session-message"
import { db } from "@/lib/db"
import { logger as rootLogger } from "@/lib/logger"

type PollSessionForMetricsParams = {
  sessionId: string
  internRunId: string
  client: OpencodeClient
  workRecordId: string
  intervalMs?: number
  timeoutMs?: number
}

const DEFAULT_INTERVAL_MS = 2000
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

const getInternRunState = async (
  internRunId: string,
): Promise<InternRunState | null> => {
  const rows = await db
    .select({ state: internRunTable.state })
    .from(internRunTable)
    .where(eq(internRunTable.id, internRunId))
    .limit(1)

  const internRun = rows[0]

  return internRun?.state ?? null
}

const shouldAbortSessionForState = (state: InternRunState | null) =>
  state === null || state === "aborted" || state === "aborted_failed"

const abortOpencodeSession = async ({
  client,
  log,
  sessionId,
}: {
  client: OpencodeClient
  log: pino.Logger
  sessionId: string
}) => {
  try {
    await client.session.abort({
      path: { id: sessionId },
    })

    log.info("Aborted OpenCode session after intern run became inactive")
  } catch (error) {
    log.warn(
      {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to abort OpenCode session after intern run became inactive",
    )
  }
}

export const pollSessionForMetrics = async ({
  sessionId,
  internRunId,
  client,
  workRecordId,
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: PollSessionForMetricsParams) => {
  const log = rootLogger.child({ sessionId, internRunId })

  log.info("Starting session metrics polling")

  const startTime = Date.now()
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

  while (Date.now() - startTime <= timeoutMs) {
    try {
      const internRunState = await getInternRunState(internRunId)
      const stillActive = internRunState
        ? isInternRunStateActive(internRunState)
        : false

      if (!stillActive) {
        log.info(
          { internRunState },
          "Intern run is no longer active, stopping session polling",
        )

        if (shouldAbortSessionForState(internRunState)) {
          await abortOpencodeSession({ client, log, sessionId })
        }

        return
      }

      const messagesResult = await client.session.messages({
        path: { id: sessionId },
      })

      if (!messagesResult.data || messagesResult.data.length === 0) {
        log.debug("No messages yet, continuing to poll")
        await sleep(intervalMs)
        continue
      }

      const assistantMessages = messagesResult.data.filter(
        isAssistantSessionMessage,
      )

      const lastAssistantMsg = assistantMessages[assistantMessages.length - 1]

      if (lastAssistantMsg) {
        const finish = lastAssistantMsg.info.finish

        if (finish && finish !== "tool-calls") {
          log.info(
            { finish, assistantMessageCount: assistantMessages.length },
            "Session finished, fetching messages for metrics",
          )
          await fetchAndUpdateMetrics({
            internRunId,
            client,
            log,
            sessionId,
            fallbackLatencyMs: null,
          })
          return
        }
      }

      log.debug("Session still in progress, continuing to poll")
      await sleep(intervalMs)
    } catch (error) {
      log.error(
        {
          error,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        "Error polling session messages",
      )
      await sleep(intervalMs)
    }
  }

  log.warn(
    "Polling timed out waiting for session to finish, failing intern run",
  )

  const elapsedMs = Date.now() - startTime
  const timeoutMetrics = await fetchSessionMetricsForTimeout({
    client,
    elapsedMs,
    log,
    sessionId,
  })

  try {
    await failInternRunCommand({
      internRunId,
      costUsd:
        timeoutMetrics?.costUsd !== null &&
        timeoutMetrics?.costUsd !== undefined
          ? String(timeoutMetrics.costUsd)
          : null,
      errorCode: "EXECUTION_TIMEOUT",
      failurePayload: {
        code: "EXECUTION_TIMEOUT",
        elapsedMs,
        message: `Execution timed out after ${timeoutMs}ms polling for session ${sessionId}`,
        metricsCollected: timeoutMetrics !== null,
        retryable: true,
        sessionId,
        timeoutMs,
      },
      latencyMs: timeoutMetrics?.latencyMs ?? elapsedMs,
      workRecordId,
      tokenInput: timeoutMetrics?.inputTokens ?? null,
      tokenOutput: timeoutMetrics?.outputTokens ?? null,
      toolActivitySummary: {
        metricsCollected: timeoutMetrics !== null,
        sessionId,
        toolCallCount: timeoutMetrics?.toolCallCount ?? 0,
      },
    })
    log.info("Successfully failed intern run after polling timeout")
    await abortOpencodeSession({ client, log, sessionId })
  } catch (failError) {
    log.error(
      { error: failError },
      "Failed to fail intern run after polling timeout",
    )
  }
}

const fetchAndUpdateMetrics = async ({
  fallbackLatencyMs,
  internRunId,
  client,
  log,
  sessionId,
}: {
  fallbackLatencyMs: number | null
  internRunId: string
  client: OpencodeClient
  log: pino.Logger
  sessionId: string
}) => {
  try {
    const metrics = await getSessionMetrics({
      client,
      fallbackLatencyMs,
      sessionId,
    })

    if (!metrics) {
      log.warn("No session messages found for metrics")
      return
    }

    log.info(
      {
        totalCost: metrics.costUsd,
        totalInputTokens: metrics.inputTokens,
        totalOutputTokens: metrics.outputTokens,
        latencyMs: metrics.latencyMs,
        toolCallCount: metrics.toolCallCount,
      },
      "Updating intern run with metrics",
    )

    await updateInternRunMetrics({
      internRunId,
      costUsd: metrics.costUsd,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      latencyMs: metrics.latencyMs,
      toolCallCount: metrics.toolCallCount,
    })

    log.info("Successfully updated intern run with metrics")
  } catch (error) {
    log.error(
      {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      "Error fetching session messages",
    )
  }
}

const fetchSessionMetricsForTimeout = async ({
  client,
  elapsedMs,
  log,
  sessionId,
}: {
  client: OpencodeClient
  elapsedMs: number
  log: pino.Logger
  sessionId: string
}) => {
  try {
    return await getSessionMetrics({
      client,
      fallbackLatencyMs: elapsedMs,
      sessionId,
    })
  } catch (error) {
    log.warn(
      {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to fetch session metrics before timeout failure",
    )
    return null
  }
}
