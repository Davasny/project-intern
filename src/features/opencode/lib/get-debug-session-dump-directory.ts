import path from "node:path"
import type { SessionDumpScope } from "@/features/opencode/schemas/session-dump-scope"
import { getProjectWorkspaceDirectory } from "@/lib/config/backend"

const sanitizePathSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-")

const formatTimestampPathSegment = (date: Date) =>
  date.toISOString().replace(/[:.]/g, "-")

export const getDebugSessionDumpDirectory = ({
  createdAt,
  projectId,
  scope,
}: {
  createdAt: Date
  projectId: string
  scope: SessionDumpScope
}) => {
  const scopeSlug =
    scope.kind === "task_record"
      ? `task-${scope.taskId}-record-${scope.recordId}`
      : scope.kind === "task"
        ? `task-${scope.taskId}`
        : scope.kind === "record"
          ? `record-${scope.recordId}`
          : "project"

  return path.join(
    getProjectWorkspaceDirectory(projectId),
    "debug-sessions",
    `${sanitizePathSegment(scopeSlug)}-${formatTimestampPathSegment(createdAt)}`,
  )
}
