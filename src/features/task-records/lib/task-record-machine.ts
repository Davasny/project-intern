import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { finalizeProjectSchemaMigration } from "@/features/project-schema/lib/finalize-project-schema-migration"
import { taskRecordTable } from "@/features/task-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type TaskRecordMachineContext = {
  agentRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
  recordId: string
  taskId: string
}

type ClaimEvent = {
  agentRunId: string
  lastTransitionAt: Date
}

type StartEvent = {
  agentRunId: string
  lastTransitionAt: Date
}

type CompleteEvent = {
  agentRunId: string
  lastTransitionAt: Date
}

type FailEvent = {
  agentRunId: string | null
  errorCode: string
  lastTransitionAt: Date
}

type SkipEvent = {
  agentRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
}

type ReleaseEvent = {
  lastTransitionAt: Date
}

type RetryEvent = {
  lastTransitionAt: Date
}

const taskRecordMachineDefinition = machine<TaskRecordMachineContext>().define({
  initial: "waiting",
  states: {
    waiting: {
      entry: (context, event: ReleaseEvent | RetryEvent) => ({
        ...context,
        agentRunId: null,
        errorCode: null,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        claim: { target: "picked_up" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "waiting" },
    },
    picked_up: {
      entry: (context, event: ClaimEvent) => ({
        ...context,
        agentRunId: event.agentRunId,
        errorCode: null,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        cancel: { target: "skipped" },
        fail: { target: "failed" },
        release: { target: "waiting" },
        start: { target: "in_progress" },
      },
      onSuccess: { target: "picked_up" },
      onError: { target: "picked_up_failed" },
    },
    picked_up_failed: {
      entry: (context, event: RetryEvent) => ({
        ...context,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        claim: { target: "picked_up" },
        retry: { target: "waiting" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "picked_up_failed" },
    },
    in_progress: {
      entry: (context, event: StartEvent) => ({
        ...context,
        agentRunId: event.agentRunId,
        errorCode: null,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        cancel: { target: "skipped" },
        complete: { target: "completed" },
        fail: { target: "failed" },
      },
      onSuccess: { target: "in_progress" },
    },
    completed: {
      on: {
        reset: { target: "waiting" },
      },
      entry: async (context, event: CompleteEvent) => {
        await finalizeProjectSchemaMigration({ taskId: context.taskId })

        return {
          ...context,
          agentRunId: event.agentRunId,
          errorCode: null,
          lastTransitionAt: event.lastTransitionAt,
        }
      },
      onSuccess: { target: "completed" },
      onError: { target: "completed_failed" },
    },
    completed_failed: {
      entry: (context, event: RetryEvent) => ({
        ...context,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        retry: { target: "completed" },
      },
      onSuccess: { target: "completed_failed" },
    },
    failed: {
      entry: async (context, event: FailEvent) => {
        logger.warn(
          { agentRunId: event.agentRunId, taskId: context.taskId },
          "Failed task record",
        )

        return {
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          lastTransitionAt: event.lastTransitionAt,
        }
      },
      on: {
        retry: { target: "waiting" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "failed" },
      onError: { target: "failed_failed" },
    },
    failed_failed: {
      entry: (context, event: RetryEvent) => ({
        ...context,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        retry: { target: "failed" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "failed_failed" },
    },
    skipped: {
      entry: (context, event: SkipEvent) => ({
        ...context,
        agentRunId: event.agentRunId,
        errorCode: event.errorCode,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        reset: { target: "waiting" },
        retry: { target: "waiting" },
      },
      onSuccess: { target: "skipped" },
    },
  },
})

export const taskRecordMachine = withDrizzlePg(taskRecordMachineDefinition, {
  db,
  table: taskRecordTable,
})
