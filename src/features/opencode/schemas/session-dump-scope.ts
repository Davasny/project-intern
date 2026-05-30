import { z } from "zod"

export const sessionDumpScopeSchema = z.object({
  recordId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
})

export type SessionDumpScopeInput = z.infer<typeof sessionDumpScopeSchema>

export type SessionDumpScopeKind = "project" | "record" | "task" | "task_record"

export type SessionDumpScope =
  | {
      kind: "project"
      recordId: null
      taskId: null
    }
  | {
      kind: "record"
      recordId: string
      taskId: null
    }
  | {
      kind: "task"
      recordId: null
      taskId: string
    }
  | {
      kind: "task_record"
      recordId: string
      taskId: string
    }

export const resolveSessionDumpScope = ({
  recordId,
  taskId,
}: SessionDumpScopeInput): SessionDumpScope => {
  if (taskId && recordId) {
    return { kind: "task_record", recordId, taskId }
  }

  if (taskId) {
    return { kind: "task", recordId: null, taskId }
  }

  if (recordId) {
    return { kind: "record", recordId, taskId: null }
  }

  return { kind: "project", recordId: null, taskId: null }
}
