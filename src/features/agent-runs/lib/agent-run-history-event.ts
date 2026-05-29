export type AgentRunHistoryEventKind =
  | "agent"
  | "error"
  | "file"
  | "metadata"
  | "reasoning"
  | "tool"

export type AgentRunHistoryEventDetail = {
  content: string | null
  error: string | null
  input: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  output: string | null
}

export type AgentRunHistoryEvent = {
  id: string
  kind: AgentRunHistoryEventKind
  title: string
  summary: string
  timestamp: number
  metadata: Array<string>
  detail: AgentRunHistoryEventDetail
}
