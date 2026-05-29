import { z } from "zod"

const agentRunStateSchema = z.enum([
  "created",
  "booting",
  "running",
  "persisting_outputs",
  "completed",
  "failed",
  "aborted",
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
