import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { db } from "@/lib/db"

type AgentRunMachineContext = {
  attemptNumber: number
  costUsd: string | null
  failurePayload: Record<string, unknown> | null
  latencyMs: number | null
  resultPayload: Record<string, unknown> | null
  selectedAgent: string | null
  selectedModel: string | null
  sessionReference: string | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
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
