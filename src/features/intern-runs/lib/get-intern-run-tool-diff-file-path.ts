import { getInternRunRecordStringValue } from "@/features/intern-runs/lib/get-intern-run-record-string-value"
import { normalizeInternRunToolPath } from "@/features/intern-runs/lib/normalize-intern-run-tool-path"

const getInputFilePath = (input: Record<string, unknown>) =>
  getInternRunRecordStringValue({ key: "filePath", record: input }) ??
  getInternRunRecordStringValue({ key: "file_path", record: input }) ??
  getInternRunRecordStringValue({ key: "path", record: input })

const getPatchFilePath = (diff: string | null) => {
  if (!diff) {
    return null
  }

  const lines = diff.split("\n")

  for (const line of lines) {
    if (line.startsWith("*** Update File: ")) {
      return line.replace("*** Update File: ", "").trim()
    }

    if (line.startsWith("*** Add File: ")) {
      return line.replace("*** Add File: ", "").trim()
    }

    if (line.startsWith("+++ b/")) {
      return line.replace("+++ b/", "").trim()
    }

    if (line.startsWith("--- a/")) {
      return line.replace("--- a/", "").trim()
    }
  }

  return null
}

export const getInternRunToolDiffFilePath = ({
  diff,
  input,
  tool,
  workspaceDirectory,
}: {
  diff: string | null
  input: Record<string, unknown>
  tool: string
  workspaceDirectory: string
}) => {
  if (tool !== "edit" && tool !== "apply_patch" && tool !== "apply_path") {
    return null
  }

  const filePath = getInputFilePath(input) ?? getPatchFilePath(diff)

  return filePath
    ? normalizeInternRunToolPath({ path: filePath, workspaceDirectory })
    : null
}
