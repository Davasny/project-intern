import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { db } from "@/lib/db"

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
  costUsd: string | null
  estimatedCostUsd: string | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  resultPayload: Record<string, unknown> | null
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type FailedEvent = {
  costUsd: string | null
  estimatedCostUsd: string | null
  failurePayload: Record<string, unknown> | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type AbortedEvent = {
  failurePayload: Record<string, unknown> | null
  toolActivitySummary: Record<string, unknown>
  toolSummary: Record<string, unknown>
}

const agentRunMachineDefinition = machine<AgentRunMachineContext>().define({
  initial: "created",
  states: {
    created: {
      on: {
        boot: { target: "booting" },
        fail: { target: "failed" },
      },
    },
    booting: {
      entry: (context, event: BootingEvent) => ({
        ...context,
        directory: event.directory,
        model: event.model,
        provider: event.provider,
        sessionReference: event.sessionReference,
        startedAt: event.startedAt,
        toolActivitySummary: event.toolActivitySummary,
        toolCallCount: event.toolCallCount,
        toolSummary: event.toolSummary,
      }),
      on: {
        abort: { target: "aborted" },
        fail: { target: "failed" },
        run: { target: "running" },
      },
      onSuccess: { target: "booting" },
    },
    running: {
      entry: (context, event: RunningEvent) => ({
        ...context,
        inputTokens: event.inputTokens,
        latencyMs: event.latencyMs,
        model: event.model,
        provider: event.provider,
        sessionReference: event.sessionReference,
        tokenInput: event.tokenInput,
        toolActivitySummary: event.toolActivitySummary,
        toolCallCount: event.toolCallCount,
        toolSummary: event.toolSummary,
      }),
      on: {
        abort: { target: "aborted" },
        fail: { target: "failed" },
        persist: { target: "persisting_outputs" },
      },
      onSuccess: { target: "running" },
    },
    persisting_outputs: {
      entry: (context, event: PersistingOutputsEvent) => ({
        ...context,
        outputTokens: event.outputTokens,
        resultPayload: event.resultPayload,
        tokenOutput: event.tokenOutput,
        toolActivitySummary: event.toolActivitySummary,
        toolCallCount: event.toolCallCount,
        toolSummary: event.toolSummary,
      }),
      on: {
        abort: { target: "aborted" },
        complete: { target: "completed" },
        fail: { target: "failed" },
      },
      onSuccess: { target: "persisting_outputs" },
    },
    completed: {
      entry: (context, event: CompletedEvent) => ({
        ...context,
        costUsd: event.costUsd,
        estimatedCostUsd: event.estimatedCostUsd,
        finishedAt: event.finishedAt,
        inputTokens: event.inputTokens,
        latencyMs: event.latencyMs,
        outputTokens: event.outputTokens,
        resultPayload: event.resultPayload,
        tokenInput: event.tokenInput,
        tokenOutput: event.tokenOutput,
        toolActivitySummary: event.toolActivitySummary,
        toolCallCount: event.toolCallCount,
        toolSummary: event.toolSummary,
      }),
      onSuccess: { target: "completed" },
    },
    failed: {
      entry: (context, event: FailedEvent) => ({
        ...context,
        costUsd: event.costUsd,
        estimatedCostUsd: event.estimatedCostUsd,
        failurePayload: event.failurePayload,
        finishedAt: event.finishedAt,
        inputTokens: event.inputTokens,
        latencyMs: event.latencyMs,
        outputTokens: event.outputTokens,
        tokenInput: event.tokenInput,
        tokenOutput: event.tokenOutput,
        toolActivitySummary: event.toolActivitySummary,
        toolCallCount: event.toolCallCount,
        toolSummary: event.toolSummary,
      }),
      onSuccess: { target: "failed" },
    },
    aborted: {
      entry: (context, event: AbortedEvent) => ({
        ...context,
        failurePayload: event.failurePayload,
        toolActivitySummary: event.toolActivitySummary,
        toolSummary: event.toolSummary,
      }),
      onSuccess: { target: "aborted" },
    },
  },
})

export const agentRunMachine = withDrizzlePg(agentRunMachineDefinition, {
  db,
  table: agentRunTable,
})
