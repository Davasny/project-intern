import type {
  InternRunHistoryEvent,
  InternRunHistoryEventKind,
  InternRunHistoryEventMetrics,
} from "@/features/intern-runs/lib/intern-run-history-event"
import type {
  InternRunSessionMessage,
  InternRunSessionMessagePart,
} from "@/features/intern-runs/lib/intern-run-session-message-types"

const compactText = (text: string) => {
  const compactedText = text.replace(/\s+/g, " ").trim()
  return compactedText.length > 140
    ? `${compactedText.slice(0, 137)}...`
    : compactedText
}

const getMessageMetadata = (message: InternRunSessionMessage) => {
  const metadata: Array<string> = [message.role]

  if (message.agent) {
    metadata.push(message.agent)
  }

  if (message.modelId) {
    metadata.push(message.modelId)
  }

  return metadata
}

const getMessageMetrics = (
  message: InternRunSessionMessage,
): InternRunHistoryEventMetrics => ({
  cost: message.cost,
  tokens: message.tokens,
})

const getPartMetrics = ({
  message,
  part,
}: {
  message: InternRunSessionMessage
  part: InternRunSessionMessagePart
}): InternRunHistoryEventMetrics =>
  part.type === "step-finish"
    ? {
        cost: part.cost,
        tokens: part.tokens,
      }
    : getMessageMetrics(message)

const createTextEvent = ({
  message,
  part,
}: {
  message: InternRunSessionMessage
  part: Extract<InternRunSessionMessagePart, { type: "text" }>
}): InternRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind: message.role === "system" ? "system" : "agent",
  title:
    message.role === "assistant"
      ? "Agent message"
      : message.role === "system"
        ? "System prompt"
        : "User message",
  summary: compactText(part.text) || "Empty message",
  timestamp: message.createdAt,
  metadata: getMessageMetadata(message),
  metrics: getMessageMetrics(message),
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
  message: InternRunSessionMessage
  part: Extract<InternRunSessionMessagePart, { type: "reasoning" }>
}): InternRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind: "reasoning",
  title: "Reasoning",
  summary: compactText(part.text) || "Reasoning trace",
  timestamp: message.createdAt,
  metadata: getMessageMetadata(message),
  metrics: getMessageMetrics(message),
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
  message: InternRunSessionMessage
  part: Extract<InternRunSessionMessagePart, { type: "tool" }>
}): InternRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind: part.error ? "error" : "tool",
  title: part.tool,
  summary: part.title ?? `${part.tool} ${part.status}`,
  timestamp: message.createdAt,
  metadata: [part.status, ...getMessageMetadata(message)],
  metrics: getMessageMetrics(message),
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
  kind: InternRunHistoryEventKind
  message: InternRunSessionMessage
  part: InternRunSessionMessagePart
  summary: string
  title: string
}): InternRunHistoryEvent => ({
  id: `${message.id}:${part.id}`,
  kind,
  title,
  summary,
  timestamp: message.createdAt,
  metadata: getMessageMetadata(message),
  metrics: getPartMetrics({ message, part }),
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
  message: InternRunSessionMessage
  part: InternRunSessionMessagePart
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
  message: InternRunSessionMessage,
): InternRunHistoryEvent | null => {
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
    metrics: getMessageMetrics(message),
    detail: {
      content: null,
      error: message.error.message,
      input: null,
      metadata: { name: message.error.name },
      output: null,
    },
  }
}

const createSystemEvent = (
  message: InternRunSessionMessage,
): InternRunHistoryEvent | null => {
  if (!message.system) {
    return null
  }

  return {
    id: `${message.id}:system`,
    kind: "system",
    title: "System prompt",
    summary: compactText(message.system) || "System prompt",
    timestamp: message.createdAt,
    metadata: getMessageMetadata(message),
    metrics: getMessageMetrics(message),
    detail: {
      content: message.system,
      error: null,
      input: null,
      metadata: null,
      output: null,
    },
  }
}

export const mapSessionMessagesToHistoryEvents = (
  messages: Array<InternRunSessionMessage>,
) =>
  messages.flatMap((message) => {
    const partEvents = message.parts.map((part) =>
      mapPartToHistoryEvent({ message, part }),
    )
    const errorEvent = createMessageErrorEvent(message)
    const systemEvent = createSystemEvent(message)

    const events: Array<InternRunHistoryEvent> = []
    if (systemEvent) {
      events.push(systemEvent)
    }
    events.push(...partEvents)
    if (errorEvent) {
      events.push(errorEvent)
    }

    return events
  })
