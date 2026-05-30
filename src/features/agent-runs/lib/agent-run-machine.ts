import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { completeTaskRecord } from "@/features/task-records/lib/complete-task-record"
import { failTaskRecord } from "@/features/task-records/lib/fail-task-record"
import { skipTaskRecord } from "@/features/task-records/lib/skip-task-record"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type {
  AbortedEvent,
  AgentRunMachineContext,
  BootingEvent,
  CompletedEvent,
  FailedEvent,
  PersistingOutputsEvent,
  RunningEvent,
} from "./agent-run-machine-types"

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

        logger.info(
          { agentRunId: event.agentRunId, taskRecordId: event.taskRecordId },
          "Agent run completed",
        )

        return {
          ...context,
          costUsd: event.costUsd ?? context.costUsd,
          estimatedCostUsd: event.estimatedCostUsd ?? context.estimatedCostUsd,
          finishedAt: event.finishedAt,
          inputTokens: event.inputTokens ?? context.inputTokens,
          latencyMs: event.latencyMs ?? context.latencyMs,
          outputTokens: event.outputTokens ?? context.outputTokens,
          resultPayload: event.resultPayload,
          tokenInput: event.tokenInput ?? context.tokenInput,
          tokenOutput: event.tokenOutput ?? context.tokenOutput,
          toolActivitySummary: event.toolActivitySummary,
          toolCallCount:
            (event.toolCallCount ?? 0) > 0
              ? event.toolCallCount
              : context.toolCallCount,
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
          costUsd: event.costUsd ?? context.costUsd,
          estimatedCostUsd: event.estimatedCostUsd ?? context.estimatedCostUsd,
          failurePayload: event.failurePayload,
          finishedAt: event.finishedAt,
          inputTokens: event.inputTokens ?? context.inputTokens,
          latencyMs: event.latencyMs ?? context.latencyMs,
          outputTokens: event.outputTokens ?? context.outputTokens,
          tokenInput: event.tokenInput ?? context.tokenInput,
          tokenOutput: event.tokenOutput ?? context.tokenOutput,
          toolActivitySummary: event.toolActivitySummary,
          toolCallCount:
            (event.toolCallCount ?? 0) > 0
              ? event.toolCallCount
              : context.toolCallCount,
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
