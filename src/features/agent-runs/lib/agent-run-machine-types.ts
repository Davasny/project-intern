type AgentRunMachineContext = {
  attemptNumber: number
  costUsd: string | null
  estimatedCostUsd: string | null
  failurePayload: Record<string, unknown> | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  model: string | null
  outputTokens: number | null
  provider: string | null
  resultPayload: Record<string, unknown> | null
  selectedAgent: string | null
  selectedModel: string | null
  selectedTemperature: number | null
  directory: string | null
  sessionReference: string | null
  startedAt: Date | null
  taskRecordId: string
  toolCallCount: number
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolSummary: Record<string, unknown>
}

type BootingEvent = {
  agentRunId: string
  directory: string | null
  model: string
  provider: string
  sessionReference: string | null
  startedAt: Date | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type RunningEvent = {
  inputTokens: number | null
  latencyMs: number | null
  model: string
  provider: string
  sessionReference: string | null
  tokenInput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type PersistingOutputsEvent = {
  outputTokens: number | null
  resultPayload: Record<string, unknown> | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type CompletedEvent = {
  agentRunId: string
  costUsd: string | null
  estimatedCostUsd: string | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  resultPayload: Record<string, unknown> | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type FailedEvent = {
  agentRunId: string
  costUsd: string | null
  errorCode: string
  estimatedCostUsd: string | null
  failurePayload: Record<string, unknown> | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type AbortedEvent = {
  agentRunId: string
  failurePayload: Record<string, unknown> | null
  taskRecordId: string
  toolActivitySummary: Record<string, unknown>
  toolSummary: Record<string, unknown>
}
