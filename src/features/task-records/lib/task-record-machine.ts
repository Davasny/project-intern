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

const taskRecordMachineDefinition = machine<TaskRecordMachineContext>().define({
  initial: "waiting",
  states: {
    waiting: {
      on: {
        claim: { target: "picked_up" },
        skip: { target: "skipped" },
      },
    },
    picked_up: {
      on: {
        cancel: { target: "skipped" },
        fail: { target: "failed" },
        release: { target: "waiting" },
        start: { target: "in_progress" },
      },
    },
    in_progress: {
      on: {
        cancel: { target: "skipped" },
        complete: { target: "completed" },
        fail: { target: "failed" },
      },
    },
    completed: {},
    failed: {
      on: {
        retry: { target: "waiting" },
        skip: { target: "skipped" },
      },
    },
    skipped: {
      on: {
        retry: { target: "waiting" },
      },
    },
  },
})

export const taskRecordMachine = withDrizzlePg(taskRecordMachineDefinition, {
  db,
  table: taskRecordTable,
})
