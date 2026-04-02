import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { taskRecordTable } from "@/features/task-records/db"
import { db } from "@/lib/db"

type TaskRecordMachineContext = {
  agentRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
  recordId: string
  taskId: string
}

type TaskRecordTransitionEvent = {
  agentRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
}

export const taskRecordMachineDefinition =
  machine<TaskRecordMachineContext>().define({
    initial: "waiting",
    states: {
      waiting: {
        entry: (context, event: TaskRecordTransitionEvent) => ({
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          lastTransitionAt: event.lastTransitionAt,
        }),
        on: {
          claim: { target: "picked_up" },
          skip: { target: "skipped" },
        },
        onSuccess: { target: "waiting" },
      },
      picked_up: {
        entry: (context, event: TaskRecordTransitionEvent) => ({
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          lastTransitionAt: event.lastTransitionAt,
        }),
        on: {
          cancel: { target: "skipped" },
          fail: { target: "failed" },
          release: { target: "waiting" },
          start: { target: "in_progress" },
        },
        onSuccess: { target: "picked_up" },
      },
      in_progress: {
        entry: (context, event: TaskRecordTransitionEvent) => ({
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
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
        entry: (context, event: TaskRecordTransitionEvent) => ({
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          lastTransitionAt: event.lastTransitionAt,
        }),
        onSuccess: { target: "completed" },
      },
      failed: {
        entry: (context, event: TaskRecordTransitionEvent) => ({
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          lastTransitionAt: event.lastTransitionAt,
        }),
        on: {
          retry: { target: "waiting" },
          skip: { target: "skipped" },
        },
        onSuccess: { target: "failed" },
      },
      skipped: {
        entry: (context, event: TaskRecordTransitionEvent) => ({
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          lastTransitionAt: event.lastTransitionAt,
        }),
        on: {
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
