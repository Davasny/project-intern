import type { OpencodeClient } from "@opencode-ai/sdk"
import { eq } from "drizzle-orm"
import type pino from "pino"
import { internRunTable } from "@/features/intern-runs/db"
import { failInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { syncSessionMetricsToInternRun } from "@/features/intern-runs/lib/sync-session-metrics-to-intern-run"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import { isInternRunStateActive } from "@/features/intern-runs/schemas/intern-run-state"
import { getSessionMetrics } from "@/features/opencode/lib/get-session-metrics"
import { isAssistantSessionMessage } from "@/features/opencode/lib/is-assistant-session-message"
import { opencodeSessionMessagesLimit } from "@/features/opencode/lib/opencode-session-messages-limit"
import { db } from "@/lib/db"
import { logger as rootLogger } from "@/lib/logger"

type PollSessionForMetricsParams = {
  sessionId: string
  internRunId: string
  client: OpencodeClient
  directory: string | null
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
  directory,
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

        await syncSessionMetricsToInternRun({
          client,
          directory,
          fallbackLatencyMs: Date.now() - startTime,
          internRunId,
          log,
          sessionId,
          trigger: "terminal_state",
        })

        if (shouldAbortSessionForState(internRunState)) {
          await abortOpencodeSession({ client, log, sessionId })
        }

        return
      }

      const messagesResult = await client.session.messages({
        path: { id: sessionId },
        query: {
          ...(directory ? { directory } : {}),
          limit: opencodeSessionMessagesLimit,
        },
      })

      if (!messagesResult.data || messagesResult.data.length === 0) {
        log.debug("No messages yet, continuing to poll")
        await sleep(intervalMs)
        continue
      }

      await syncSessionMetricsToInternRun({
        client,
        directory,
        fallbackLatencyMs: Date.now() - startTime,
        internRunId,
        log,
        sessionId,
        trigger: "poll_tick",
      })

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
          await syncSessionMetricsToInternRun({
            client,
            directory,
            fallbackLatencyMs: Date.now() - startTime,
            internRunId,
            log,
            sessionId,
            trigger: "final_finish",
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
    directory,
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
        reason: `Execution timed out after ${timeoutMs}ms polling for session ${sessionId}`,
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

const fetchSessionMetricsForTimeout = async ({
  client,
  directory,
  elapsedMs,
  log,
  sessionId,
}: {
  client: OpencodeClient
  directory: string | null
  elapsedMs: number
  log: pino.Logger
  sessionId: string
}) => {
  try {
    return await getSessionMetrics({
      client,
      directory,
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
