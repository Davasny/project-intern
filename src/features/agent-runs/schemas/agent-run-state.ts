import { z } from "zod"

const agentRunStateSchema = z.enum([
  "created",
  "booting",
  "booting_failed",
  "running",
  "running_failed",
  "persisting_outputs",
  "persisting_outputs_failed",
  "completed",
  "completed_failed",
  "failed",
  "failed_failed",
  "aborted",
  "aborted_failed",
])

export type AgentRunState = z.infer<typeof agentRunStateSchema>

export const activeAgentRunStates = [
  "created",
  "booting",
  "running",
  "persisting_outputs",
] as const

export const isAgentRunStateActive = (state: AgentRunState): boolean =>
  activeAgentRunStates.includes(state as (typeof activeAgentRunStates)[number])
