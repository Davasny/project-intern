import { updateAgentRunMetrics } from "@/features/agent-runs/lib/update-agent-run-metrics"
import { logger as rootLogger } from "@/lib/logger"
import { getOpencodeClient } from "@/lib/opencode/get-opencode-client"

type PollSessionForMetricsParams = {
  sessionId: string
  agentRunId: string
  intervalMs?: number
  timeoutMs?: number
}

const DEFAULT_INTERVAL_MS = 2000
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

type SessionStatus =
  | { type: "idle" }
  | { type: "busy" }
  | { type: "retry"; attempt: number; message: string; next: number }

export const pollSessionForMetrics = async ({
  sessionId,
  agentRunId,
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: PollSessionForMetricsParams) => {
  const log = rootLogger.child({ sessionId, agentRunId })

  log.info("Starting session metrics polling")

  const startTime = Date.now()

  const poll = async (): Promise<void> => {
    // Check if we've exceeded timeout
    if (Date.now() - startTime > timeoutMs) {
      log.warn("Polling timed out waiting for session to become idle")
      return
    }

    try {
      const client = await getOpencodeClient()
      const statusResult = await client.session.status()

      if (!statusResult.data) {
        log.warn("session.status() returned no data")
        return
      }

      const sessionStatus: SessionStatus | undefined =
        statusResult.data[sessionId]

      if (!sessionStatus) {
        log.warn("Session not found in status response, will retry")
        return
      }

      if (sessionStatus.type === "idle") {
        log.info("Session is idle, fetching messages for metrics")
        await fetchAndUpdateMetrics(sessionId, agentRunId, log)
        return
      }

      if (sessionStatus.type === "retry") {
        log.info(
          { attempt: sessionStatus.attempt, message: sessionStatus.message },
          "Session is retrying, will continue polling",
        )
      }

      // Session is busy, wait and poll again
      setTimeout(poll, intervalMs)
    } catch (error) {
      log.error(
        {
          error,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        "Error polling session status",
      )
      // Continue polling despite errors
      setTimeout(poll, intervalMs)
    }
  }

  // Start polling
  setTimeout(poll, intervalMs)
}

async function fetchAndUpdateMetrics(
  sessionId: string,
  agentRunId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: any,
) {
  try {
    const client = await getOpencodeClient()
    const messagesResult = await client.session.messages({
      path: { id: sessionId },
    })

    if (!messagesResult.data) {
      log.warn("session.messages() returned no data")
      return
    }

    // Filter assistant messages and aggregate metrics
    const assistantMessages = messagesResult.data.filter(
      (msg) => msg.info.role === "assistant",
    )

    if (assistantMessages.length === 0) {
      log.warn("No assistant messages found in session")
      return
    }

    // Aggregate cost and tokens from all assistant messages
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

    // Calculate latency from first to last assistant message
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

    // Count tool calls by looking for messages with tool-related parts
    let toolCallCount = 0
    for (const msg of messagesResult.data) {
      if (msg.parts) {
        for (const part of msg.parts) {
          // MCP tool result parts have type "tool_result"
          const partType = (part as { type?: string }).type
          if (partType === "tool_result") {
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
