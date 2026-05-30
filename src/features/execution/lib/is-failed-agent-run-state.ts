import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"

export const isFailedAgentRunState = (state: AgentRunState) =>
  state === "booting_failed" ||
  state === "running_failed" ||
  state === "persisting_outputs_failed" ||
  state === "completed_failed" ||
  state === "failed" ||
  state === "failed_failed" ||
  state === "aborted_failed"
