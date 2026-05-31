export type InternRunHistoryEventKind =
  | "agent"
  | "error"
  | "file"
  | "metadata"
  | "reasoning"
  | "system"
  | "tool"

type InternRunHistoryEventDetail = {
  content: string | null
  error: string | null
  input: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  output: string | null
}

type InternRunHistoryEventTokens = {
  cacheRead: number
  cacheWrite: number
  input: number
  output: number
  reasoning: number
}

export type InternRunHistoryEventMetrics = {
  cost: number | null
  tokens: InternRunHistoryEventTokens | null
}

export type InternRunHistoryEvent = {
  id: string
  kind: InternRunHistoryEventKind
  title: string
  summary: string
  timestamp: number
  metadata: Array<string>
  metrics: InternRunHistoryEventMetrics
  detail: InternRunHistoryEventDetail
}
