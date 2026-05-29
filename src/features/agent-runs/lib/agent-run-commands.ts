import { sql } from "drizzle-orm"
import {
  createAgentRunActor,
  getAgentRunActorById,
} from "@/features/agent-runs/lib/agent-run-machine"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"
import { db } from "@/lib/db"
import { resolveEffectiveModel } from "@/lib/llm/resolve-effective-model"
import { resolveEffectiveTemperature } from "@/lib/llm/resolve-effective-temperature"
import { logger } from "@/lib/logger"

type CreateAgentRunCommandParams = {
  attemptNumber: number
  model: string | null
  projectDefaultModel: string
  projectDefaultTemperature: number
  taskRecordId: string
  temperature: number | null
}

type CreateAgentRunCommandResult = {
  agentRunId: string
  selectedModel: string
  selectedTemperature: number
}

export const createAgentRunCommand = async ({
  attemptNumber,
  model,
  projectDefaultModel,
  projectDefaultTemperature,
  taskRecordId,
  temperature,
}: CreateAgentRunCommandParams): Promise<CreateAgentRunCommandResult | null> => {
  const agentRunIdResult = await db.execute<{ id: string }>(sql`
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
  const selectedTemperature = resolveEffectiveTemperature({
    projectDefaultTemperature,
    taskTemperature: temperature,
  })

  try {
    await createAgentRunActor(agentRunId, {
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
      selectedTemperature,
      sessionReference: null,
      startedAt: null,
      taskRecordId,
      tokenInput: null,
      tokenOutput: null,
      toolActivitySummary: {},
      toolCallCount: 0,
      toolSummary: {},
    })
  } catch (error) {
    logger.error(
      { agentRunId, taskRecordId, error },
      "createAgentRunActor failed",
    )
    throw error
  }

  return { agentRunId, selectedModel, selectedTemperature }
}

type BootAgentRunCommandParams = {
  agentRunId: string
  directory: string | null
  model: string
  provider: string
  sessionReference: string | null
  toolActivitySummary: Record<string, unknown>
}

export const bootAgentRunCommand = async ({
  agentRunId,
  directory,
  model,
  provider,
  sessionReference,
  toolActivitySummary,
}: BootAgentRunCommandParams) => {
  const actor = await getAgentRunActorById(agentRunId)

  if (!actor) {
    throw new Error(`Agent run ${agentRunId} not found.`)
  }

  const startedAt = new Date()
  const toolCallCount = getToolCallCount(toolActivitySummary)

  await actor.send("boot", {
    agentRunId,
    directory,
    model,
    provider,
    sessionReference,
    startedAt,
    toolActivitySummary,
    toolCallCount,
    toolSummary: toolActivitySummary,
  })
}

type RunAgentRunCommandParams = {
  agentRunId: string
  latencyMs: number | null
  model: string
  provider: string
  sessionReference: string | null
  tokenInput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const runAgentRunCommand = async ({
  agentRunId,
  latencyMs,
  model,
  provider,
  sessionReference,
  tokenInput,
  toolActivitySummary,
}: RunAgentRunCommandParams) => {
  const actor = await getAgentRunActorById(agentRunId)

  if (!actor) {
    throw new Error(`Agent run ${agentRunId} not found.`)
  }

  await actor.send("run", {
    inputTokens: tokenInput,
    latencyMs,
    model,
    provider,
    sessionReference,
    tokenInput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}

type PersistAgentRunOutputsCommandParams = {
  agentRunId: string
  resultPayload: Record<string, unknown> | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

const persistAgentRunOutputsCommand = async ({
  agentRunId,
  resultPayload,
  tokenOutput,
  toolActivitySummary,
}: PersistAgentRunOutputsCommandParams) => {
  const actor = await getAgentRunActorById(agentRunId)

  if (!actor) {
    throw new Error(`Agent run ${agentRunId} not found.`)
  }

  await actor.send("persist", {
    outputTokens: tokenOutput,
    resultPayload,
    tokenOutput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}

type CompleteAgentRunCommandParams = {
  agentRunId: string
  costUsd: string | null
  latencyMs: number | null
  resultPayload: Record<string, unknown> | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const completeAgentRunCommand = async ({
  agentRunId,
  costUsd,
  latencyMs,
  resultPayload,
  taskRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: CompleteAgentRunCommandParams) => {
  const actor = await getAgentRunActorById(agentRunId)

  if (actor.state === "running") {
    await persistAgentRunOutputsCommand({
      agentRunId,
      resultPayload,
      tokenOutput,
      toolActivitySummary,
    })
  }

  const completionActor = await getAgentRunActorById(agentRunId)

  await completionActor.send("complete", {
    agentRunId,
    costUsd,
    estimatedCostUsd: costUsd,
    finishedAt: new Date(),
    inputTokens: tokenInput,
    latencyMs,
    outputTokens: tokenOutput,
    resultPayload,
    taskRecordId,
    tokenInput,
    tokenOutput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}

type FailAgentRunCommandParams = {
  agentRunId: string
  costUsd: string | null
  errorCode: string
  failurePayload: Record<string, unknown>
  latencyMs: number | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const failAgentRunCommand = async ({
  agentRunId,
  costUsd,
  errorCode,
  failurePayload,
  latencyMs,
  taskRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: FailAgentRunCommandParams) => {
  const actor = await getAgentRunActorById(agentRunId)

  if (!actor) {
    throw new Error(`Agent run ${agentRunId} not found.`)
  }

  const finishedAt = new Date()

  await actor.send("fail", {
    agentRunId,
    costUsd,
    errorCode,
    estimatedCostUsd: costUsd,
    failurePayload,
    finishedAt,
    inputTokens: tokenInput,
    latencyMs,
    outputTokens: tokenOutput,
    taskRecordId,
    tokenInput,
    tokenOutput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}

type AbortAgentRunCommandParams = {
  agentRunId: string
  failurePayload: Record<string, unknown> | null
  taskRecordId: string
  toolActivitySummary: Record<string, unknown>
}

export const abortAgentRunCommand = async ({
  agentRunId,
  failurePayload,
  taskRecordId,
  toolActivitySummary,
}: AbortAgentRunCommandParams) => {
  const actor = await getAgentRunActorById(agentRunId)

  if (!actor) {
    throw new Error(`Agent run ${agentRunId} not found.`)
  }

  await actor.send("abort", {
    agentRunId,
    failurePayload,
    taskRecordId,
    toolActivitySummary,
    toolSummary: toolActivitySummary,
  })
}
