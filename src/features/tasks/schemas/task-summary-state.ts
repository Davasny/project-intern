import { z } from "zod"

export const taskSummaryStateSchema = z.enum([
  "not_started",
  "in_progress",
  "partially_completed",
  "completed",
  "failed",
  "cancelled",
])

export type TaskSummaryState = z.infer<typeof taskSummaryStateSchema>
