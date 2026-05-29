import type {
  AgentRunHistoryEvent,
  AgentRunHistoryEventKind,
} from "@/features/agent-runs/lib/agent-run-history-event"
import type {
  AgentRunSessionMessage,
  AgentRunSessionMessagePart,
} from "@/features/agent-runs/lib/agent-run-session-message-types"

const compactText = (text: string) => {
  const compactedText = text.replace(/\s+/g, " ").trim()
  return compactedText.length > 140
    ? `${compactedText.slice(0, 137)}...`
    : compactedText
}

const getMessageMetadata = (message: AgentRunSessionMessage) => {
  const metadata: Array<string> = [message.role]

  if (message.agent) {
    metadata.push(message.agent)
  }

  if (message.modelId) {
    metadata.push(message.modelId)
  }

  return metadata
}

const createTextEvent = ({
  message,
  part,
}: {
  message: AgentRunSessionMessage
  part: Extract<AgentRunSessionMessagePart, { type: "text" }>
}): AgentRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind: "agent",
  title: message.role === "assistant" ? "Agent message" : "User message",
  summary: compactText(part.text) || "Empty message",
  timestamp: message.createdAt,
  metadata: getMessageMetadata(message),
  detail: {
    content: part.text,
    error: null,
    input: null,
    metadata: {
      ignored: part.ignored,
      synthetic: part.synthetic,
    },
    output: null,
  },
})

const createReasoningEvent = ({
  message,
  part,
}: {
  message: AgentRunSessionMessage
  part: Extract<AgentRunSessionMessagePart, { type: "reasoning" }>
}): AgentRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind: "reasoning",
  title: "Reasoning",
  summary: compactText(part.text) || "Reasoning trace",
  timestamp: message.createdAt,
  metadata: getMessageMetadata(message),
  detail: {
    content: part.text,
    error: null,
    input: null,
    metadata: null,
    output: null,
  },
})

const createToolEvent = ({
  message,
  part,
}: {
  message: AgentRunSessionMessage
  part: Extract<AgentRunSessionMessagePart, { type: "tool" }>
}): AgentRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind: part.error ? "error" : "tool",
  title: part.tool,
  summary: part.title ?? `${part.tool} ${part.status}`,
  timestamp: message.createdAt,
  metadata: [part.status, ...getMessageMetadata(message)],
  detail: {
    content: part.title,
    error: part.error,
    input: part.input,
    metadata:
      part.metadata || part.attachments.length > 0
        ? {
            attachments: part.attachments,
            callId: part.callId,
            metadata: part.metadata,
          }
        : { callId: part.callId },
    output: part.output,
  },
})

const createMetadataEvent = ({
  kind,
  message,
  part,
  summary,
  title,
}: {
  kind: AgentRunHistoryEventKind
  message: AgentRunSessionMessage
  part: AgentRunSessionMessagePart
  summary: string
  title: string
}): AgentRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind,
  title,
  summary,
  timestamp: message.createdAt,
  metadata: getMessageMetadata(message),
  detail: {
    content: null,
    error: null,
    input: null,
    metadata: { part },
    output: null,
  },
})

const mapPartToHistoryEvent = ({
  message,
  part,
}: {
  message: AgentRunSessionMessage
  part: AgentRunSessionMessagePart
}) => {
  if (part.type === "text") {
    return createTextEvent({ message, part })
  }

  if (part.type === "reasoning") {
    return createReasoningEvent({ message, part })
  }

  if (part.type === "tool") {
    return createToolEvent({ message, part })
  }

  if (part.type === "file") {
    return createMetadataEvent({
      kind: "file",
      message,
      part,
      summary: part.filename ?? part.url,
      title: "File",
    })
  }

  if (part.type === "retry") {
    return createMetadataEvent({
      kind: "error",
      message,
      part,
      summary: part.error.message,
      title: `Retry attempt ${String(part.attempt)}`,
    })
  }

  if (part.type === "agent") {
    return createMetadataEvent({
      kind: "metadata",
      message,
      part,
      summary: part.name,
      title: "Agent selected",
    })
  }

  if (part.type === "subtask") {
    return createMetadataEvent({
      kind: "metadata",
      message,
      part,
      summary: part.description,
      title: `Subtask for ${part.agent}`,
    })
  }

  return createMetadataEvent({
    kind: "metadata",
    message,
    part,
    summary: part.type,
    title: part.type,
  })
}

const createMessageErrorEvent = (
  message: AgentRunSessionMessage,
): AgentRunHistoryEvent | null => {
  if (!message.error) {
    return null
  }

  return {
    id: `${message.id}:error`,
    kind: "error",
    title: message.error.name,
    summary: message.error.message,
    timestamp: message.createdAt,
    metadata: getMessageMetadata(message),
    detail: {
      content: null,
      error: message.error.message,
      input: null,
      metadata: { name: message.error.name },
      output: null,
    },
  }
}

export const mapSessionMessagesToHistoryEvents = (
  messages: Array<AgentRunSessionMessage>,
) =>
  messages.flatMap((message) => {
    const partEvents = message.parts.map((part) =>
      mapPartToHistoryEvent({ message, part }),
    )
    const errorEvent = createMessageErrorEvent(message)

    return errorEvent ? [...partEvents, errorEvent] : partEvents
  })
