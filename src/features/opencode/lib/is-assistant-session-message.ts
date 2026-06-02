import type { OpencodeClient } from "@opencode-ai/sdk"

type SessionMessages = NonNullable<
  Awaited<ReturnType<OpencodeClient["session"]["messages"]>>["data"]
>

export type AssistantSessionMessage = SessionMessages[number] & {
  info: Extract<SessionMessages[number]["info"], { role: "assistant" }>
}

export const isAssistantSessionMessage = (
  message: SessionMessages[number],
): message is AssistantSessionMessage => message.info.role === "assistant"
