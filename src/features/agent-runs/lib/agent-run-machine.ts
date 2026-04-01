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
  sessionReference: string | null
  startedAt: Date | null
  taskRecordId: string
  toolCallCount: number
  tokenInput: number | null
  tokenOutput: number | null
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
      on: {
        abort: { target: "aborted" },
        fail: { target: "failed" },
        run: { target: "running" },
      },
    },
    running: {
      on: {
        abort: { target: "aborted" },
        fail: { target: "failed" },
        persist: { target: "persisting_outputs" },
      },
    },
    persisting_outputs: {
      on: {
        abort: { target: "aborted" },
        complete: { target: "completed" },
        fail: { target: "failed" },
      },
    },
    completed: {},
    failed: {},
    aborted: {},
  },
})

export const agentRunMachine = withDrizzlePg(agentRunMachineDefinition, {
  db,
  table: agentRunTable,
})
