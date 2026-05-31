export type InternRunMachineContext = {
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
  selectedIntern: string | null
  selectedModel: string | null
  selectedTemperature: number | null
  directory: string | null
  sessionReference: string | null
  startedAt: Date | null
  workRecordId: string
  toolCallCount: number
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolSummary: Record<string, unknown>
}

export type BootingEvent = {
  internRunId: string
  directory: string | null
  model: string
  provider: string
  sessionReference: string | null
  startedAt: Date | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

export type RunningEvent = {
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

export type PersistingOutputsEvent = {
  outputTokens: number | null
  resultPayload: Record<string, unknown> | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

export type CompletedEvent = {
  internRunId: string
  costUsd: string | null
  estimatedCostUsd: string | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  resultPayload: Record<string, unknown> | null
  workRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

export type FailedEvent = {
  internRunId: string
  costUsd: string | null
  errorCode: string
  estimatedCostUsd: string | null
  failurePayload: Record<string, unknown> | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  workRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

export type AbortedEvent = {
  internRunId: string
  failurePayload: Record<string, unknown> | null
  workRecordId: string
  toolActivitySummary: Record<string, unknown>
  toolSummary: Record<string, unknown>
}
