import { getInternRunRecordStringValue } from "@/features/intern-runs/lib/get-intern-run-record-string-value"

export const getInternRunToolUrl = ({
  input,
  tool,
}: {
  input: Record<string, unknown>
  tool: string
}) => {
  if (tool !== "webfetch") {
    return null
  }

  return (
    getInternRunRecordStringValue({ key: "url", record: input }) ??
    getInternRunRecordStringValue({ key: "URL", record: input })
  )
}
