import { TRPCError } from "@trpc/server"
import { agentRunMachine } from "@/features/agent-runs/lib/agent-run-machine"

export const getAgentRunActor = async (agentRunId: string) => {
  const actor = await agentRunMachine.getActor(agentRunId)

  if (!actor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent run was not found.",
    })
  }

  return actor
}
