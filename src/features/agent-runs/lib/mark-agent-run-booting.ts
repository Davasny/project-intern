import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { db } from "@/lib/db"

type MarkAgentRunBootingParams = {
  agentRunId: string
  sessionReference: string | null
  toolActivitySummary: Record<string, unknown>
}

export const markAgentRunBooting = async ({
  agentRunId,
  sessionReference,
  toolActivitySummary,
}: MarkAgentRunBootingParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("boot")
  await db
    .update(agentRunTable)
    .set({ sessionReference, toolActivitySummary })
    .where(eq(agentRunTable.id, agentRunId))
  return actor
}
