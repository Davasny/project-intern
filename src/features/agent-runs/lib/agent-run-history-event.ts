export type AgentRunHistoryEventKind =
  | "agent"
  | "error"
  | "file"
  | "metadata"
  | "reasoning"
  | "system"
  | "tool"

type AgentRunHistoryEventDetail = {
  content: string | null
  error: string | null
  input: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  output: string | null
}

type AgentRunHistoryEventTokens = {
  cacheRead: number
  cacheWrite: number
  input: number
  output: number
  reasoning: number
}

export type AgentRunHistoryEventMetrics = {
  cost: number | null
  tokens: AgentRunHistoryEventTokens | null
}

export type AgentRunHistoryEvent = {
  id: string
  kind: AgentRunHistoryEventKind
  title: string
  summary: string
  timestamp: number
  metadata: Array<string>
  metrics: AgentRunHistoryEventMetrics
  detail: AgentRunHistoryEventDetail
}
