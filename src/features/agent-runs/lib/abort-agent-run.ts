import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { skipTaskRecord } from "@/features/task-records/lib/skip-task-record"

type AbortAgentRunParams = {
  agentRunId: string
  failurePayload: Record<string, unknown> | null
  taskRecordId: string
  toolActivitySummary: Record<string, unknown>
}

export const abortAgentRun = async ({
  agentRunId,
  failurePayload,
  taskRecordId,
  toolActivitySummary,
}: AbortAgentRunParams) => {
  const actor = await getAgentRunActor(agentRunId)
  const nextActor = await actor.send("abort", {
    failurePayload,
    toolActivitySummary,
    toolSummary: toolActivitySummary,
  })
  await skipTaskRecord({
    agentRunId,
    errorCode: null,
    taskRecordId,
  })
  return nextActor
}
