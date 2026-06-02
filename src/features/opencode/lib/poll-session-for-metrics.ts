import type { OpencodeClient } from "@opencode-ai/sdk"
import { eq } from "drizzle-orm"
import type pino from "pino"
import { internRunTable } from "@/features/intern-runs/db"
import { failInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { updateInternRunMetrics } from "@/features/intern-runs/lib/update-intern-run-metrics"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import { isInternRunStateActive } from "@/features/intern-runs/schemas/intern-run-state"
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
        (msg) => msg.info.role === "assistant",
      )

      const lastAssistantMsg = assistantMessages[assistantMessages.length - 1]

      if (lastAssistantMsg) {
        const finish = (lastAssistantMsg.info as { finish?: string | null })
          .finish

        if (finish && finish !== "tool-calls") {
          log.info(
            { finish, assistantMessageCount: assistantMessages.length },
            "Session finished, fetching messages for metrics",
          )
          await fetchAndUpdateMetrics({
            internRunId,
            client,
            log,
            messages: messagesResult.data,
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

  try {
    await failInternRunCommand({
      internRunId,
      costUsd: null,
      errorCode: "EXECUTION_TIMEOUT",
      failurePayload: {
        code: "EXECUTION_TIMEOUT",
        message: `Execution timed out after ${timeoutMs}ms polling for session ${sessionId}`,
        retryable: true,
      },
      latencyMs: null,
      workRecordId,
      tokenInput: null,
      tokenOutput: null,
      toolActivitySummary: {},
    })
    log.info("Successfully failed intern run after polling timeout")
  } catch (failError) {
    log.error(
      { error: failError },
      "Failed to fail intern run after polling timeout",
    )
  }
}

async function fetchAndUpdateMetrics({
  internRunId,
  client,
  log,
  messages,
}: {
  internRunId: string
  client: OpencodeClient
  log: pino.Logger
  messages: Awaited<ReturnType<typeof client.session.messages>>["data"]
}) {
  try {
    if (!messages) {
      log.warn("session.messages() returned no data")
      return
    }

    const assistantMessages = messages.filter(
      (msg) => msg.info.role === "assistant",
    )

    if (assistantMessages.length === 0) {
      log.warn("No assistant messages found in session")
      return
    }

    let totalCost = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0

    for (const msg of assistantMessages) {
      const assistantMsg = msg.info as {
        cost: number
        tokens: {
          input: number
          output: number
        }
      }
      totalCost += assistantMsg.cost ?? 0
      totalInputTokens += assistantMsg.tokens?.input ?? 0
      totalOutputTokens += assistantMsg.tokens?.output ?? 0
    }

    const firstMsg = assistantMessages[0]
    const lastMsg = assistantMessages[assistantMessages.length - 1]

    const firstTime = firstMsg.info.time?.created
    const lastTime =
      (lastMsg.info as { time?: { created?: number; completed?: number } }).time
        ?.completed ?? lastMsg.info.time?.created

    let latencyMs: number | null = null
    if (firstTime && lastTime) {
      latencyMs = lastTime - firstTime
    }

    let toolCallCount = 0
    for (const msg of messages) {
      if (msg.parts) {
        for (const part of msg.parts) {
          const partType = (part as { type?: string }).type
          if (partType === "tool") {
            toolCallCount++
          }
        }
      }
    }

    log.info(
      {
        totalCost,
        totalInputTokens,
        totalOutputTokens,
        latencyMs,
        toolCallCount,
        assistantMessageCount: assistantMessages.length,
      },
      "Updating intern run with metrics",
    )

    await updateInternRunMetrics({
      internRunId,
      costUsd: totalCost,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs,
      toolCallCount,
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
