import { z } from "zod"

export const taskRecordStateSchema = z.enum([
  "waiting",
  "picked_up",
  "in_progress",
  "completed",
  "failed",
  "skipped",
])

export type TaskRecordState = z.infer<typeof taskRecordStateSchema>

export const activeTaskRecordStates = [
  "picked_up",
  "in_progress",
] satisfies Array<TaskRecordState>
