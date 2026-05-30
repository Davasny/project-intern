import type { OpencodeClient } from "@opencode-ai/sdk"
import { eq } from "drizzle-orm"
import type pino from "pino"
import { agentRunTable } from "@/features/agent-runs/db"
import { failAgentRunCommand } from "@/features/agent-runs/lib/agent-run-commands"
import { updateAgentRunMetrics } from "@/features/agent-runs/lib/update-agent-run-metrics"
import { isAgentRunStateActive } from "@/features/agent-runs/schemas/agent-run-state"
import { db } from "@/lib/db"
import { logger as rootLogger } from "@/lib/logger"

type PollSessionForMetricsParams = {
  sessionId: string
  agentRunId: string
  client: OpencodeClient
  taskRecordId: string
  intervalMs?: number
  timeoutMs?: number
}

const DEFAULT_INTERVAL_MS = 2000
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

const isAgentRunStillActive = async (agentRunId: string) => {
  const rows = await db
    .select({ state: agentRunTable.state })
    .from(agentRunTable)
    .where(eq(agentRunTable.id, agentRunId))
    .limit(1)

  const agentRun = rows[0]

  return agentRun ? isAgentRunStateActive(agentRun.state) : false
}

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

    log.info("Aborted OpenCode session after agent run became inactive")
  } catch (error) {
    log.warn(
      {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to abort OpenCode session after agent run became inactive",
    )
  }
}

export const pollSessionForMetrics = async ({
  sessionId,
  agentRunId,
  client,
  taskRecordId,
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: PollSessionForMetricsParams) => {
  const log = rootLogger.child({ sessionId, agentRunId })

  log.info("Starting session metrics polling")

  const startTime = Date.now()
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

  while (Date.now() - startTime <= timeoutMs) {
    try {
      const stillActive = await isAgentRunStillActive(agentRunId)

      if (!stillActive) {
        log.info("Agent run is no longer active, stopping session polling")
        await abortOpencodeSession({ client, log, sessionId })
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
            agentRunId,
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

  log.warn("Polling timed out waiting for session to finish, failing agent run")

  try {
    await failAgentRunCommand({
      agentRunId,
      costUsd: null,
      errorCode: "EXECUTION_TIMEOUT",
      failurePayload: {
        code: "EXECUTION_TIMEOUT",
        message: `Execution timed out after ${timeoutMs}ms polling for session ${sessionId}`,
        retryable: true,
      },
      latencyMs: null,
      taskRecordId,
      tokenInput: null,
      tokenOutput: null,
      toolActivitySummary: {},
    })
    log.info("Successfully failed agent run after polling timeout")
  } catch (failError) {
    log.error(
      { error: failError },
      "Failed to fail agent run after polling timeout",
    )
  }
}

async function fetchAndUpdateMetrics({
  agentRunId,
  client,
  log,
  messages,
}: {
  agentRunId: string
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
      "Updating agent run with metrics",
    )

    await updateAgentRunMetrics({
      agentRunId,
      costUsd: totalCost,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs,
      toolCallCount,
    })

    log.info("Successfully updated agent run with metrics")
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
