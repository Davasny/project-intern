import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { internRunTable } from "@/features/intern-runs/db"
import { completeWorkRecord } from "@/features/work-records/lib/complete-work-record"
import { failWorkRecord } from "@/features/work-records/lib/fail-work-record"
import { skipWorkRecord } from "@/features/work-records/lib/skip-work-record"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type {
  AbortedEvent,
  BootingEvent,
  CompletedEvent,
  FailedEvent,
  InternRunMachineContext,
  PersistingOutputsEvent,
  RunningEvent,
} from "./intern-run-machine-types"

const internRunMachineDefinition = machine<InternRunMachineContext>().define({
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
            internRunId: event.internRunId,
            directory: event.directory,
            model: event.model,
            provider: event.provider,
            sessionReference: event.sessionReference,
          },
          "Intern run booting",
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
        await completeWorkRecord({
          internRunId: event.internRunId,
          workRecordId: event.workRecordId,
        })

        logger.info(
          { internRunId: event.internRunId, workRecordId: event.workRecordId },
          "Intern run completed",
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
        await failWorkRecord({
          internRunId: event.internRunId,
          errorCode: event.errorCode,
          workRecordId: event.workRecordId,
        })

        logger.warn(
          {
            internRunId: event.internRunId,
            errorCode: event.errorCode,
            workRecordId: event.workRecordId,
          },
          "Intern run failed",
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
        await skipWorkRecord({
          internRunId: event.internRunId,
          errorCode: null,
          workRecordId: event.workRecordId,
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

const internRunMachine = withDrizzlePg(internRunMachineDefinition, {
  db,
  table: internRunTable,
})

export const createInternRunActor = async (
  id: string,
  context: InternRunMachineContext,
) => internRunMachine.createActor(id, context)

export const getInternRunActorById = async (internRunId: string) => {
  const actor = await internRunMachine.getActor(internRunId)

  if (!actor) {
    throw new Error(`Intern run ${internRunId} not found.`)
  }

  return actor
}
