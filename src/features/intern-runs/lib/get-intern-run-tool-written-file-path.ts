import { getInternRunRecordStringValue } from "@/features/intern-runs/lib/get-intern-run-record-string-value"
import { normalizeInternRunToolPath } from "@/features/intern-runs/lib/normalize-intern-run-tool-path"

export const getInternRunToolWrittenFilePath = ({
  input,
  tool,
  workspaceDirectory,
}: {
  input: Record<string, unknown>
  tool: string
  workspaceDirectory: string
}) => {
  if (tool !== "write") {
    return null
  }

  const filePath =
    getInternRunRecordStringValue({ key: "filePath", record: input }) ??
    getInternRunRecordStringValue({ key: "file_path", record: input }) ??
    getInternRunRecordStringValue({ key: "path", record: input })

  return filePath
    ? normalizeInternRunToolPath({ path: filePath, workspaceDirectory })
    : null
}
