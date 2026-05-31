import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { finalizeProjectSchemaMigration } from "@/features/project-schema/lib/finalize-project-schema-migration"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type WorkRecordMachineContext = {
  internRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
  recordId: string
  taskId: string
}

type ClaimEvent = {
  internRunId: string
  lastTransitionAt: Date
}

type StartEvent = {
  internRunId: string
  lastTransitionAt: Date
}

type CompleteEvent = {
  internRunId: string
  lastTransitionAt: Date
}

type FailEvent = {
  internRunId: string | null
  errorCode: string
  lastTransitionAt: Date
}

type SkipEvent = {
  internRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
}

type ReleaseEvent = {
  lastTransitionAt: Date
}

type RetryEvent = {
  lastTransitionAt: Date
}

const workRecordMachineDefinition = machine<WorkRecordMachineContext>().define({
  initial: "waiting",
  states: {
    waiting: {
      entry: (context, event: ReleaseEvent | RetryEvent) => ({
        ...context,
        internRunId: null,
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
        internRunId: event.internRunId,
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
        internRunId: event.internRunId,
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
          internRunId: event.internRunId,
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
          { internRunId: event.internRunId, taskId: context.taskId },
          "Failed work record",
        )

        return {
          ...context,
          internRunId: event.internRunId,
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
        internRunId: event.internRunId,
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

export const workRecordMachine = withDrizzlePg(workRecordMachineDefinition, {
  db,
  table: workRecordTable,
})
