import { sql } from "drizzle-orm"
import { agentRunMachine } from "@/features/agent-runs/lib/agent-run-machine"
import { db } from "@/lib/db"
import { resolveEffectiveModel } from "@/lib/llm/resolve-effective-model"

type GeneratedIdRow = {
  id: string
}

type CreateAgentRunParams = {
  attemptNumber: number
  model: string | null
  projectDefaultModel: string
  taskRecordId: string
}

type CreatedAgentRun = {
  agentRunId: string
  selectedModel: string
}

export const createAgentRun = async ({
  attemptNumber,
  model,
  projectDefaultModel,
  taskRecordId,
}: CreateAgentRunParams): Promise<CreatedAgentRun | null> => {
  const agentRunIdResult = await db.execute<GeneratedIdRow>(sql`
    select uuidv7() as id
  `)
  const agentRunId = agentRunIdResult.rows[0]?.id ?? null

  if (!agentRunId) {
    return null
  }

  const selectedModel = resolveEffectiveModel({
    projectDefaultModel,
    taskModel: model,
  })

  await agentRunMachine.createActor(agentRunId, {
    attemptNumber,
    costUsd: null,
    directory: null,
    estimatedCostUsd: null,
    failurePayload: null,
    finishedAt: null,
    inputTokens: null,
    latencyMs: null,
    model: null,
    outputTokens: null,
    provider: null,
    resultPayload: null,
    selectedAgent: "record-worker",
    selectedModel,
    sessionReference: null,
    startedAt: null,
    taskRecordId,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary: {},
    toolCallCount: 0,
    toolSummary: {},
  })

  return { agentRunId, selectedModel }
}
