import { sql } from "drizzle-orm"
import { getToolCallCount } from "@/features/intern-runs/lib/get-tool-call-count"
import {
  createInternRunActor,
  getInternRunActorById,
} from "@/features/intern-runs/lib/intern-run-machine"
import { db } from "@/lib/db"
import { resolveEffectiveModel } from "@/lib/llm/resolve-effective-model"
import { resolveEffectiveTemperature } from "@/lib/llm/resolve-effective-temperature"
import { logger } from "@/lib/logger"

type CreateInternRunCommandParams = {
  attemptNumber: number
  model: string | null
  projectDefaultModel: string
  projectDefaultTemperature: number
  workRecordId: string
  temperature: number | null
}

type CreateInternRunCommandResult = {
  internRunId: string
  selectedModel: string
  selectedTemperature: number
}

export const createInternRunCommand = async ({
  attemptNumber,
  model,
  projectDefaultModel,
  projectDefaultTemperature,
  workRecordId,
  temperature,
}: CreateInternRunCommandParams): Promise<CreateInternRunCommandResult | null> => {
  const internRunIdResult = await db.execute<{ id: string }>(sql`
    select uuidv7() as id
  `)
  const internRunId = internRunIdResult.rows[0]?.id ?? null

  if (!internRunId) {
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
    await createInternRunActor(internRunId, {
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
      selectedIntern: "intern",
      selectedModel,
      selectedTemperature,
      sessionReference: null,
      startedAt: null,
      workRecordId,
      tokenInput: null,
      tokenOutput: null,
      toolActivitySummary: {},
      toolCallCount: 0,
      toolSummary: {},
    })
  } catch (error) {
    logger.error(
      { internRunId, workRecordId, error },
      "createInternRunActor failed",
    )
    throw error
  }

  return { internRunId, selectedModel, selectedTemperature }
}

type BootInternRunCommandParams = {
  internRunId: string
  directory: string | null
  model: string
  provider: string
  sessionReference: string | null
  toolActivitySummary: Record<string, unknown>
}

export const bootInternRunCommand = async ({
  internRunId,
  directory,
  model,
  provider,
  sessionReference,
  toolActivitySummary,
}: BootInternRunCommandParams) => {
  const actor = await getInternRunActorById(internRunId)

  if (!actor) {
    throw new Error(`Intern run ${internRunId} not found.`)
  }

  const startedAt = new Date()
  const toolCallCount = getToolCallCount(toolActivitySummary)

  await actor.send("boot", {
    internRunId,
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

type RunInternRunCommandParams = {
  internRunId: string
  latencyMs: number | null
  model: string
  provider: string
  sessionReference: string | null
  tokenInput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const runInternRunCommand = async ({
  internRunId,
  latencyMs,
  model,
  provider,
  sessionReference,
  tokenInput,
  toolActivitySummary,
}: RunInternRunCommandParams) => {
  const actor = await getInternRunActorById(internRunId)

  if (!actor) {
    throw new Error(`Intern run ${internRunId} not found.`)
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

type PersistInternRunOutputsCommandParams = {
  internRunId: string
  resultPayload: Record<string, unknown> | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

const persistInternRunOutputsCommand = async ({
  internRunId,
  resultPayload,
  tokenOutput,
  toolActivitySummary,
}: PersistInternRunOutputsCommandParams) => {
  const actor = await getInternRunActorById(internRunId)

  if (!actor) {
    throw new Error(`Intern run ${internRunId} not found.`)
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

type CompleteInternRunCommandParams = {
  internRunId: string
  costUsd: string | null
  latencyMs: number | null
  resultPayload: Record<string, unknown> | null
  workRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const completeInternRunCommand = async ({
  internRunId,
  costUsd,
  latencyMs,
  resultPayload,
  workRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: CompleteInternRunCommandParams) => {
  const actor = await getInternRunActorById(internRunId)

  if (actor.state === "running") {
    await persistInternRunOutputsCommand({
      internRunId,
      resultPayload,
      tokenOutput,
      toolActivitySummary,
    })
  }

  const completionActor = await getInternRunActorById(internRunId)

  await completionActor.send("complete", {
    internRunId,
    costUsd,
    estimatedCostUsd: costUsd,
    finishedAt: new Date(),
    inputTokens: tokenInput,
    latencyMs,
    outputTokens: tokenOutput,
    resultPayload,
    workRecordId,
    tokenInput,
    tokenOutput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}

type FailInternRunCommandParams = {
  internRunId: string
  costUsd: string | null
  errorCode: string
  failurePayload: Record<string, unknown>
  latencyMs: number | null
  workRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const failInternRunCommand = async ({
  internRunId,
  costUsd,
  errorCode,
  failurePayload,
  latencyMs,
  workRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: FailInternRunCommandParams) => {
  const actor = await getInternRunActorById(internRunId)

  if (!actor) {
    throw new Error(`Intern run ${internRunId} not found.`)
  }

  const finishedAt = new Date()

  await actor.send("fail", {
    internRunId,
    costUsd,
    errorCode,
    estimatedCostUsd: costUsd,
    failurePayload,
    finishedAt,
    inputTokens: tokenInput,
    latencyMs,
    outputTokens: tokenOutput,
    workRecordId,
    tokenInput,
    tokenOutput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}

type AbortInternRunCommandParams = {
  internRunId: string
  failurePayload: Record<string, unknown> | null
  workRecordId: string
  toolActivitySummary: Record<string, unknown>
}

export const abortInternRunCommand = async ({
  internRunId,
  failurePayload,
  workRecordId,
  toolActivitySummary,
}: AbortInternRunCommandParams) => {
  const actor = await getInternRunActorById(internRunId)

  if (!actor) {
    throw new Error(`Intern run ${internRunId} not found.`)
  }

  await actor.send("abort", {
    internRunId,
    failurePayload,
    finishedAt: new Date(),
    workRecordId,
    toolActivitySummary,
    toolSummary: toolActivitySummary,
  })
}

type SkipInternRunCommandParams = {
  internRunId: string
  resultPayload: Record<string, unknown>
  workRecordId: string
  toolActivitySummary: Record<string, unknown>
}

export const skipInternRunCommand = async ({
  internRunId,
  resultPayload,
  workRecordId,
  toolActivitySummary,
}: SkipInternRunCommandParams) => {
  const actor = await getInternRunActorById(internRunId)

  if (!actor) {
    throw new Error(`Intern run ${internRunId} not found.`)
  }

  await actor.send("skip", {
    internRunId,
    finishedAt: new Date(),
    resultPayload,
    workRecordId,
    toolActivitySummary,
    toolSummary: toolActivitySummary,
  })
}
