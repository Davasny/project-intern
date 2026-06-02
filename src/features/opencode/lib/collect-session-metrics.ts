import type { OpencodeClient } from "@opencode-ai/sdk"
import { isAssistantSessionMessage } from "@/features/opencode/lib/is-assistant-session-message"

type SessionMessages = NonNullable<
  Awaited<ReturnType<OpencodeClient["session"]["messages"]>>["data"]
>

export type SessionMetrics = {
  costUsd: number | null
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number | null
  toolCallCount: number
}

export const collectSessionMetrics = ({
  fallbackLatencyMs,
  messages,
}: {
  fallbackLatencyMs: number | null
  messages: SessionMessages
}): SessionMetrics => {
  const assistantMessages = messages.filter(isAssistantSessionMessage)

  let totalCost = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const message of assistantMessages) {
    totalCost += message.info.cost
    totalInputTokens += message.info.tokens.input
    totalOutputTokens += message.info.tokens.output
  }

  const firstMessage = assistantMessages[0]
  const lastMessage = assistantMessages[assistantMessages.length - 1]
  const firstTime = firstMessage?.info.time.created
  const lastTime =
    lastMessage?.info.time.completed ?? lastMessage?.info.time.created
  const latencyMs =
    firstTime && lastTime ? lastTime - firstTime : fallbackLatencyMs

  let toolCallCount = 0
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "tool") {
        toolCallCount++
      }
    }
  }

  return {
    costUsd: assistantMessages.length > 0 ? totalCost : null,
    inputTokens: assistantMessages.length > 0 ? totalInputTokens : null,
    outputTokens: assistantMessages.length > 0 ? totalOutputTokens : null,
    latencyMs,
    toolCallCount,
  }
}
