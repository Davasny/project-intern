import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getAgentRunActivityScope } from "@/features/observability/lib/get-agent-run-activity-scope"
import { completeTaskRecord } from "@/features/task-records/lib/complete-task-record"
import { failTaskRecord } from "@/features/task-records/lib/fail-task-record"
import { skipTaskRecord } from "@/features/task-records/lib/skip-task-record"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type AgentRunMachineContext = {
  attemptNumber: number
  costUsd: string | null
  estimatedCostUsd: string | null
  failurePayload: Record<string, unknown> | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  model: string | null
  outputTokens: number | null
  provider: string | null
  resultPayload: Record<string, unknown> | null
  selectedAgent: string | null
  selectedModel: string | null
  selectedTemperature: number | null
  directory: string | null
  sessionReference: string | null
  startedAt: Date | null
  taskRecordId: string
  toolCallCount: number
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolSummary: Record<string, unknown>
}

type BootingEvent = {
  agentRunId: string
  directory: string | null
  model: string
  provider: string
  sessionReference: string | null
  startedAt: Date | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type RunningEvent = {
  inputTokens: number | null
  latencyMs: number | null
  model: string
  provider: string
  sessionReference: string | null
  tokenInput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type PersistingOutputsEvent = {
  outputTokens: number | null
  resultPayload: Record<string, unknown> | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type CompletedEvent = {
  agentRunId: string
  costUsd: string | null
  estimatedCostUsd: string | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  resultPayload: Record<string, unknown> | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type FailedEvent = {
  agentRunId: string
  costUsd: string | null
  errorCode: string
  estimatedCostUsd: string | null
  failurePayload: Record<string, unknown> | null
  finishedAt: Date | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
  toolCallCount: number
  toolSummary: Record<string, unknown>
}

type AbortedEvent = {
  agentRunId: string
  failurePayload: Record<string, unknown> | null
  taskRecordId: string
  toolActivitySummary: Record<string, unknown>
  toolSummary: Record<string, unknown>
}

const agentRunMachineDefinition = machine<AgentRunMachineContext>().define({
  initial: "created",
  states: {
    created: {
      on: {
        boot: { target: "booting" },
        fail: { target: "failed" },
      },
    },
    booting: {
      entry: async (context, event: BootingEvent) => {
        const activityScope = await getAgentRunActivityScope(event.agentRunId)

        await createActivityLogEvent({
          actorId: event.agentRunId,
          actorType: "executor",
          agentRunId: event.agentRunId,
          database: db,
          entityId: event.agentRunId,
          entityType: "agentRun",
          eventType: "agentRun.started",
          organizationId: activityScope.organizationId,
          payload: {
            attemptNumber: activityScope.attemptNumber,
            directory: event.directory,
            model: event.model,
            provider: event.provider,
            sessionReference: event.sessionReference,
            startedAt: event.startedAt,
          },
          projectId: activityScope.projectId,
          recordId: activityScope.recordId,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: activityScope.taskId,
          taskRecordId: activityScope.taskRecordId,
        })

        logger.info(
          {
            agentRunId: event.agentRunId,
            directory: event.directory,
            model: event.model,
            provider: event.provider,
            sessionReference: event.sessionReference,
          },
          "Agent run booting",
        )

        return {
          ...context,
          directory: event.directory,
          model: event.model,
          provider: event.provider,
          sessionReference: event.sessionReference,
          startedAt: event.startedAt,
          toolActivitySummary: event.toolActivitySummary,
          toolCallCount: event.toolCallCount,
          toolSummary: event.toolSummary,
        }
      },
      on: {
        abort: { target: "aborted" },
        fail: { target: "failed" },
        run: { target: "running" },
      },
      onSuccess: { target: "booting" },
      onError: { target: "booting_failed" },
    },
    booting_failed: {
      on: { retry: { target: "booting" } },
    },
    running: {
      entry: async (context, event: RunningEvent) => ({
        ...context,
        inputTokens: event.inputTokens,
        latencyMs: event.latencyMs,
        model: event.model,
        provider: event.provider,
        sessionReference: event.sessionReference,
        tokenInput: event.tokenInput,
        toolActivitySummary: event.toolActivitySummary,
        toolCallCount: event.toolCallCount,
        toolSummary: event.toolSummary,
      }),
      on: {
        abort: { target: "aborted" },
        fail: { target: "failed" },
        persist: { target: "persisting_outputs" },
      },
      onSuccess: { target: "running" },
      onError: { target: "running_failed" },
    },
    running_failed: {
      on: { retry: { target: "running" } },
    },
    persisting_outputs: {
      entry: async (context, event: PersistingOutputsEvent) => ({
        ...context,
        outputTokens: event.outputTokens,
        resultPayload: event.resultPayload,
        tokenOutput: event.tokenOutput,
        toolActivitySummary: event.toolActivitySummary,
        toolCallCount: event.toolCallCount,
        toolSummary: event.toolSummary,
      }),
      on: {
        abort: { target: "aborted" },
        complete: { target: "completed" },
        fail: { target: "failed" },
      },
      onSuccess: { target: "persisting_outputs" },
      onError: { target: "persisting_outputs_failed" },
    },
    persisting_outputs_failed: {
      on: { retry: { target: "persisting_outputs" } },
    },
    completed: {
      entry: async (context, event: CompletedEvent) => {
        await completeTaskRecord({
          agentRunId: event.agentRunId,
          taskRecordId: event.taskRecordId,
        })

        const activityScope = await getAgentRunActivityScope(event.agentRunId)

        await createActivityLogEvent({
          actorId: event.agentRunId,
          actorType: "executor",
          agentRunId: event.agentRunId,
          database: db,
          entityId: event.agentRunId,
          entityType: "agentRun",
          eventType: "agentRun.completed",
          organizationId: activityScope.organizationId,
          payload: {
            attemptNumber: activityScope.attemptNumber,
            estimatedCostUsd: event.estimatedCostUsd,
            finishedAt: event.finishedAt,
            latencyMs: event.latencyMs,
          },
          projectId: activityScope.projectId,
          recordId: activityScope.recordId,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: activityScope.taskId,
          taskRecordId: activityScope.taskRecordId,
        })

        logger.info(
          { agentRunId: event.agentRunId, taskRecordId: event.taskRecordId },
          "Agent run completed",
        )

        return {
          ...context,
          costUsd: event.costUsd,
          estimatedCostUsd: event.estimatedCostUsd,
          finishedAt: event.finishedAt,
          inputTokens: event.inputTokens,
          latencyMs: event.latencyMs,
          outputTokens: event.outputTokens,
          resultPayload: event.resultPayload,
          tokenInput: event.tokenInput,
          tokenOutput: event.tokenOutput,
          toolActivitySummary: event.toolActivitySummary,
          toolCallCount: event.toolCallCount,
          toolSummary: event.toolSummary,
        }
      },
      onSuccess: { target: "completed" },
      onError: { target: "completed_failed" },
    },
    completed_failed: {
      on: { retry: { target: "completed" } },
    },
    failed: {
      entry: async (context, event: FailedEvent) => {
        await failTaskRecord({
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          taskRecordId: event.taskRecordId,
        })

        const activityScope = await getAgentRunActivityScope(event.agentRunId)

        await createActivityLogEvent({
          actorId: event.agentRunId,
          actorType: "executor",
          agentRunId: event.agentRunId,
          database: db,
          entityId: event.agentRunId,
          entityType: "agentRun",
          eventType: "agentRun.failed",
          organizationId: activityScope.organizationId,
          payload: {
            attemptNumber: activityScope.attemptNumber,
            errorCode: event.errorCode,
            failurePayload: event.failurePayload,
            finishedAt: event.finishedAt,
            latencyMs: event.latencyMs,
          },
          projectId: activityScope.projectId,
          recordId: activityScope.recordId,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: activityScope.taskId,
          taskRecordId: activityScope.taskRecordId,
        })

        logger.warn(
          {
            agentRunId: event.agentRunId,
            errorCode: event.errorCode,
            taskRecordId: event.taskRecordId,
          },
          "Agent run failed",
        )

        return {
          ...context,
          costUsd: event.costUsd,
          estimatedCostUsd: event.estimatedCostUsd,
          failurePayload: event.failurePayload,
          finishedAt: event.finishedAt,
          inputTokens: event.inputTokens,
          latencyMs: event.latencyMs,
          outputTokens: event.outputTokens,
          tokenInput: event.tokenInput,
          tokenOutput: event.tokenOutput,
          toolActivitySummary: event.toolActivitySummary,
          toolCallCount: event.toolCallCount,
          toolSummary: event.toolSummary,
        }
      },
      onSuccess: { target: "failed" },
      onError: { target: "failed_failed" },
    },
    failed_failed: {
      on: { retry: { target: "failed" } },
    },
    aborted: {
      entry: async (context, event: AbortedEvent) => {
        await skipTaskRecord({
          agentRunId: event.agentRunId,
          errorCode: null,
          taskRecordId: event.taskRecordId,
        })

        return {
          ...context,
          failurePayload: event.failurePayload,
          toolActivitySummary: event.toolActivitySummary,
          toolSummary: event.toolSummary,
        }
      },
      onSuccess: { target: "aborted" },
      onError: { target: "aborted_failed" },
    },
    aborted_failed: {
      on: { retry: { target: "aborted" } },
    },
  },
})

const agentRunMachine = withDrizzlePg(agentRunMachineDefinition, {
  db,
  table: agentRunTable,
})

export const createAgentRunActor = async (
  id: string,
  context: AgentRunMachineContext,
) => agentRunMachine.createActor(id, context)

export const getAgentRunActorById = async (agentRunId: string) => {
  const actor = await agentRunMachine.getActor(agentRunId)

  if (!actor) {
    throw new Error(`Agent run ${agentRunId} not found.`)
  }

  return actor
}
