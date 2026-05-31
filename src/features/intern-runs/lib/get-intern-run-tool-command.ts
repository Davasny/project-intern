import { getInternRunRecordStringValue } from "@/features/intern-runs/lib/get-intern-run-record-string-value"
import { normalizeInternRunToolCommand } from "@/features/intern-runs/lib/normalize-intern-run-tool-command"

export const getInternRunToolCommand = ({
  input,
  tool,
  workspaceDirectory,
}: {
  input: Record<string, unknown>
  tool: string
  workspaceDirectory: string
}) => {
  if (tool !== "bash") {
    return null
  }

  const command =
    getInternRunRecordStringValue({ key: "command", record: input }) ??
    getInternRunRecordStringValue({ key: "cmd", record: input }) ??
    getInternRunRecordStringValue({ key: "script", record: input })

  return command
    ? normalizeInternRunToolCommand({ command, workspaceDirectory })
    : null
}
