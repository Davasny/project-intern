export type AgentRunSessionTokens = {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
}

export type AgentRunSessionMessageError = {
  name: string
  message: string
}

type AgentRunSessionMessagePartBase = {
  id: string
}

export type AgentRunSessionMessagePart =
  | (AgentRunSessionMessagePartBase & {
      ignored: boolean
      synthetic: boolean
      text: string
      type: "text"
    })
  | (AgentRunSessionMessagePartBase & {
      text: string
      type: "reasoning"
    })
  | (AgentRunSessionMessagePartBase & {
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
  | (AgentRunSessionMessagePartBase & {
      filename: string | null
      mime: string
      url: string
      type: "file"
    })
  | (AgentRunSessionMessagePartBase & {
      snapshot: string | null
      type: "step-start"
    })
  | (AgentRunSessionMessagePartBase & {
      cost: number
      reason: string
      snapshot: string | null
      tokens: AgentRunSessionTokens
      type: "step-finish"
    })
  | (AgentRunSessionMessagePartBase & {
      snapshot: string
      type: "snapshot"
    })
  | (AgentRunSessionMessagePartBase & {
      files: Array<string>
      hash: string
      type: "patch"
    })
  | (AgentRunSessionMessagePartBase & {
      name: string
      type: "agent"
    })
  | (AgentRunSessionMessagePartBase & {
      attempt: number
      createdAt: number
      error: AgentRunSessionMessageError
      type: "retry"
    })
  | (AgentRunSessionMessagePartBase & {
      auto: boolean
      type: "compaction"
    })
  | (AgentRunSessionMessagePartBase & {
      agent: string
      description: string
      prompt: string
      type: "subtask"
    })

export type AgentRunSessionMessage = {
  agent: string | null
  completedAt: number | null
  cost: number | null
  createdAt: number
  error: AgentRunSessionMessageError | null
  id: string
  modelId: string | null
  parts: Array<AgentRunSessionMessagePart>
  path: {
    cwd: string | null
    root: string | null
  } | null
  providerId: string | null
  role: "assistant" | "system" | "user"
  system: string | null
  tokens: AgentRunSessionTokens | null
}

export type AgentRunSessionMessagesResult = {
  directory: string | null
  messages: Array<AgentRunSessionMessage>
  sessionReference: string | null
}
