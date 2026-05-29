import type { OpencodeClient } from "@opencode-ai/sdk"
import type { Logger } from "pino"
import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { updateAgentRunMetrics } from "@/features/agent-runs/lib/update-agent-run-metrics"
import { withOpencodeForOrg } from "@/features/opencode/lib/get-opencode-client"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type SyncAgentRunMetricsFromSessionParams = {
  agentRunId: string
  organizationId: string
}

/**
 * Fetches the final session messages from OpenCode and persists cost,
 * token counts, latency, and tool call count to the agent run row.
 *
 * Called after the state machine has transitioned to completed/failed
 * so that real metrics overwrite the null placeholders written by
 * the state machine transition.
 */
export const syncAgentRunMetricsFromSession = async ({
  agentRunId,
  organizationId,
}: SyncAgentRunMetricsFromSessionParams) => {
  const log = logger.child({ agentRunId, organizationId })

  const run = await db
    .select({
      directory: agentRunTable.directory,
      sessionReference: agentRunTable.sessionReference,
    })
    .from(agentRunTable)
    .where(eq(agentRunTable.id, agentRunId))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!run?.sessionReference) {
    log.debug("No session reference, skipping metrics sync")
    return
  }

  log.info("Syncing agent run metrics from session")

  await withOpencodeForOrg({
    fn: async ({ client }) => {
      await fetchAndPersistMetrics({
        agentRunId,
        client,
        directory: run.directory,
        log,
        sessionId: run.sessionReference!,
      })
    },
    organizationId,
    runtimeTemperature: null,
  })
}

async function fetchAndPersistMetrics({
  agentRunId,
  client,
  directory,
  log,
  sessionId,
}: {
  agentRunId: string
  client: OpencodeClient
  directory: string | null
  log: Logger
  sessionId: string
}) {
  try {
    const messagesResult = await client.session.messages({
      path: { id: sessionId },
      ...(directory ? { query: { directory } } : {}),
    })

    if (!messagesResult.data || messagesResult.data.length === 0) {
      log.warn("No session messages returned, skipping metrics sync")
      return
    }

    const assistantMessages = messagesResult.data.filter(
      (msg) => msg.info.role === "assistant",
    )

    if (assistantMessages.length === 0) {
      log.warn("No assistant messages found in session, skipping metrics sync")
      return
    }

    let totalCost = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0

    for (const msg of assistantMessages) {
      const assistantMsg = msg.info as {
        cost?: number
        tokens?: {
          input?: number
          output?: number
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
      (lastMsg.info as { time?: { created?: number; completed?: number } })
        .time?.completed ?? lastMsg.info.time?.created

    let latencyMs: number | null = null
    if (firstTime && lastTime) {
      latencyMs = lastTime - firstTime
    }

    let toolCallCount = 0
    for (const msg of messagesResult.data) {
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
      "Persisting agent run metrics from session",
    )

    await updateAgentRunMetrics({
      agentRunId,
      costUsd: totalCost,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs,
      toolCallCount,
    })

    log.info("Successfully synced agent run metrics from session")
  } catch (error) {
    log.error(
      {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to sync agent run metrics from session",
    )
  }
}
