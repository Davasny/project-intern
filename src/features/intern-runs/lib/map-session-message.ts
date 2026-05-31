import type { Message, Part } from "@opencode-ai/sdk"
import type {
  InternRunSessionMessage,
  InternRunSessionMessageError,
  InternRunSessionMessagePart,
  InternRunSessionTokens,
} from "@/features/intern-runs/lib/intern-run-session-message-types"

const toTokens = ({
  cache,
  input,
  output,
  reasoning,
}: {
  cache: { read: number; write: number }
  input: number
  output: number
  reasoning: number
}): InternRunSessionTokens => ({
  cacheRead: cache.read,
  cacheWrite: cache.write,
  input,
  output,
  reasoning,
})

const toMessageError = (
  message: Extract<Message, { role: "assistant" }>,
): InternRunSessionMessageError | null => {
  if (!message.error) {
    return null
  }

  if (message.error.name === "ProviderAuthError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  if (message.error.name === "UnknownError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  if (message.error.name === "MessageAbortedError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  if (message.error.name === "APIError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  return {
    message: "Message output exceeded the provider limit.",
    name: message.error.name,
  }
}

const toPart = (part: Part): InternRunSessionMessagePart => {
  switch (part.type) {
    case "text":
      return {
        id: part.id,
        ignored: part.ignored ?? false,
        synthetic: part.synthetic ?? false,
        text: part.text,
        type: "text",
      }
    case "reasoning":
      return {
        id: part.id,
        text: part.text,
        type: "reasoning",
      }
    case "tool": {
      if (part.state.status === "pending") {
        return {
          attachments: [],
          callId: part.callID,
          error: null,
          id: part.id,
          input: part.state.input,
          metadata: null,
          output: null,
          status: part.state.status,
          title: null,
          tool: part.tool,
          type: "tool",
        }
      }

      if (part.state.status === "running") {
        return {
          attachments: [],
          callId: part.callID,
          error: null,
          id: part.id,
          input: part.state.input,
          metadata: part.state.metadata ?? null,
          output: null,
          status: part.state.status,
          title: part.state.title ?? null,
          tool: part.tool,
          type: "tool",
        }
      }

      if (part.state.status === "completed") {
        return {
          attachments:
            part.state.attachments?.map((attachment) => ({
              filename: attachment.filename ?? null,
              mime: attachment.mime,
              url: attachment.url,
            })) ?? [],
          callId: part.callID,
          error: null,
          id: part.id,
          input: part.state.input,
          metadata: part.state.metadata,
          output: part.state.output,
          status: part.state.status,
          title: part.state.title,
          tool: part.tool,
          type: "tool",
        }
      }

      return {
        attachments: [],
        callId: part.callID,
        error: part.state.error,
        id: part.id,
        input: part.state.input,
        metadata: part.state.metadata ?? null,
        output: null,
        status: part.state.status,
        title: null,
        tool: part.tool,
        type: "tool",
      }
    }
    case "file":
      return {
        filename: part.filename ?? null,
        id: part.id,
        mime: part.mime,
        type: "file",
        url: part.url,
      }
    case "step-start":
      return {
        id: part.id,
        snapshot: part.snapshot ?? null,
        type: "step-start",
      }
    case "step-finish":
      return {
        cost: part.cost,
        id: part.id,
        reason: part.reason,
        snapshot: part.snapshot ?? null,
        tokens: toTokens(part.tokens),
        type: "step-finish",
      }
    case "snapshot":
      return {
        id: part.id,
        snapshot: part.snapshot,
        type: "snapshot",
      }
    case "patch":
      return {
        files: part.files,
        hash: part.hash,
        id: part.id,
        type: "patch",
      }
    case "agent":
      return {
        id: part.id,
        name: part.name,
        type: "agent",
      }
    case "retry":
      return {
        attempt: part.attempt,
        createdAt: part.time.created,
        error: {
          message: part.error.data.message,
          name: part.error.name,
        },
        id: part.id,
        type: "retry",
      }
    case "compaction":
      return {
        auto: part.auto,
        id: part.id,
        type: "compaction",
      }
    case "subtask":
      return {
        agent: part.agent,
        description: part.description,
        id: part.id,
        prompt: part.prompt,
        type: "subtask",
      }
  }
}

const toSessionMessage = ({
  info,
  parts,
}: {
  info: Message
  parts: Array<Part>
}) => {
  if (info.role === "user") {
    return {
      agent: info.agent,
      completedAt: null,
      cost: null,
      createdAt: info.time.created,
      error: null,
      id: info.id,
      modelId: info.model.modelID,
      parts: parts.map(toPart),
      path: null,
      providerId: info.model.providerID,
      role: info.role,
      system: info.system ?? null,
      tokens: null,
    } satisfies InternRunSessionMessage
  }

  if ((info as { role: string }).role === "system") {
    const msg = info as { id: string; time: { created: number } }
    return {
      agent: null,
      completedAt: null,
      cost: null,
      createdAt: msg.time.created,
      error: null,
      id: msg.id,
      modelId: null,
      parts: parts.map(toPart),
      path: null,
      providerId: null,
      role: "system",
      system: null,
      tokens: null,
    } satisfies InternRunSessionMessage
  }

  return {
    agent: null,
    completedAt: info.time.completed ?? null,
    cost: info.cost,
    createdAt: info.time.created,
    error: toMessageError(info),
    id: info.id,
    modelId: info.modelID,
    parts: parts.map(toPart),
    path: {
      cwd: info.path.cwd,
      root: info.path.root,
    },
    providerId: info.providerID,
    role: info.role,
    system: null,
    tokens: toTokens(info.tokens),
  } satisfies InternRunSessionMessage
}

export { toSessionMessage }
