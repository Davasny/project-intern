import { z } from "zod"

export const agentRunStateSchema = z.enum([
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
] satisfies Array<AgentRunState>
