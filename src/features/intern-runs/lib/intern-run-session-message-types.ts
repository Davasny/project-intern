export type InternRunSessionTokens = {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
}

export type InternRunSessionMessageError = {
  name: string
  message: string
}

type InternRunSessionMessagePartBase = {
  id: string
}

export type InternRunSessionMessagePart =
  | (InternRunSessionMessagePartBase & {
      ignored: boolean
      synthetic: boolean
      text: string
      type: "text"
    })
  | (InternRunSessionMessagePartBase & {
      text: string
      type: "reasoning"
    })
  | (InternRunSessionMessagePartBase & {
      attachments: Array<{
        filename: string | null
        mime: string
        url: string
      }>
      callId: string
      error: string | null
      input: Record<string, unknown>
      metadata: Record<string, unknown> | null
      output: string | null
      status: "completed" | "error" | "pending" | "running"
      title: string | null
      tool: string
      type: "tool"
    })
  | (InternRunSessionMessagePartBase & {
      filename: string | null
      mime: string
      url: string
      type: "file"
    })
  | (InternRunSessionMessagePartBase & {
      snapshot: string | null
      type: "step-start"
    })
  | (InternRunSessionMessagePartBase & {
      cost: number
      reason: string
      snapshot: string | null
      tokens: InternRunSessionTokens
      type: "step-finish"
    })
  | (InternRunSessionMessagePartBase & {
      snapshot: string
      type: "snapshot"
    })
  | (InternRunSessionMessagePartBase & {
      files: Array<string>
      hash: string
      type: "patch"
    })
  | (InternRunSessionMessagePartBase & {
      name: string
      type: "agent"
    })
  | (InternRunSessionMessagePartBase & {
      attempt: number
      createdAt: number
      error: InternRunSessionMessageError
      type: "retry"
    })
  | (InternRunSessionMessagePartBase & {
      auto: boolean
      type: "compaction"
    })
  | (InternRunSessionMessagePartBase & {
      agent: string
      description: string
      prompt: string
      type: "subtask"
    })

export type InternRunSessionMessage = {
  agent: string | null
  completedAt: number | null
  cost: number | null
  createdAt: number
  error: InternRunSessionMessageError | null
  id: string
  modelId: string | null
  parts: Array<InternRunSessionMessagePart>
  path: {
    cwd: string | null
    root: string | null
  } | null
  providerId: string | null
  role: "assistant" | "system" | "user"
  system: string | null
  tokens: InternRunSessionTokens | null
}

export type InternRunSessionMessagesResult = {
  directory: string | null
  messages: Array<InternRunSessionMessage>
  sessionReference: string | null
}
