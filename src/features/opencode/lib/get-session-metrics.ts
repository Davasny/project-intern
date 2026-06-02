import type { OpencodeClient } from "@opencode-ai/sdk"
import {
  collectSessionMetrics,
  type SessionMetrics,
} from "@/features/opencode/lib/collect-session-metrics"

export const getSessionMetrics = async ({
  client,
  directory,
  fallbackLatencyMs,
  sessionId,
}: {
  client: OpencodeClient
  directory: string | null
  fallbackLatencyMs: number | null
  sessionId: string
}): Promise<SessionMetrics | null> => {
  const messagesResult = await client.session.messages({
    path: { id: sessionId },
    ...(directory ? { query: { directory } } : {}),
  })

  if (!messagesResult.data || messagesResult.data.length === 0) {
    return null
  }

  return collectSessionMetrics({
    fallbackLatencyMs,
    messages: messagesResult.data,
  })
}
