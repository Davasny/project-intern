import { getInternRunRecordStringValue } from "@/features/intern-runs/lib/get-intern-run-record-string-value"

const writtenContentKeys = ["content", "text", "fileContent", "file_content"]

export const getInternRunToolWrittenContent = ({
  input,
  tool,
}: {
  input: Record<string, unknown>
  tool: string
}) => {
  if (tool !== "write") {
    return null
  }

  for (const key of writtenContentKeys) {
    const content = getInternRunRecordStringValue({ key, record: input })

    if (content) {
      return content
    }
  }

  return null
}
