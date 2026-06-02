import type { OpencodeClient } from "@opencode-ai/sdk"
import {
  collectSessionMetrics,
  type SessionMetrics,
} from "@/features/opencode/lib/collect-session-metrics"

export const getSessionMetrics = async ({
  client,
  fallbackLatencyMs,
  sessionId,
}: {
  client: OpencodeClient
  fallbackLatencyMs: number | null
  sessionId: string
}): Promise<SessionMetrics | null> => {
  const messagesResult = await client.session.messages({
    path: { id: sessionId },
  })

  if (!messagesResult.data || messagesResult.data.length === 0) {
    return null
  }

  return collectSessionMetrics({
    fallbackLatencyMs,
    messages: messagesResult.data,
  })
}
