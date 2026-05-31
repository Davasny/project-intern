import { getInternRunRecordStringValue } from "@/features/intern-runs/lib/get-intern-run-record-string-value"
import { isInternRunDiffText } from "@/features/intern-runs/lib/is-intern-run-diff-text"

const patchToolNames = ["apply_patch", "apply_path"]

const diffInputKeys = [
  "diff",
  "patch",
  "patchText",
  "patch_text",
  "content",
  "text",
]

const editBeforeKeys = ["oldString", "old_string", "oldText", "old_text"]
const editAfterKeys = ["newString", "new_string", "newText", "new_text"]

const getFirstStringValue = ({
  keys,
  record,
}: {
  keys: ReadonlyArray<string>
  record: Record<string, unknown> | null
}) => {
  for (const key of keys) {
    const value = getInternRunRecordStringValue({ key, record })

    if (value) {
      return value
    }
  }

  return null
}

const buildEditDiff = ({
  after,
  before,
  filePath,
}: {
  after: string
  before: string
  filePath: string | null
}) => {
  const title = filePath ?? "edited file"
  const beforeLines = before.split("\n").map((line) => `-${line}`)
  const afterLines = after.split("\n").map((line) => `+${line}`)

  return [
    `--- ${title}`,
    `+++ ${title}`,
    "@@",
    ...beforeLines,
    ...afterLines,
  ].join("\n")
}

const getDiffText = ({
  input,
  metadata,
  output,
}: {
  input: Record<string, unknown>
  metadata: Record<string, unknown> | null
  output: string | null
}) => {
  const inputText = getFirstStringValue({ keys: diffInputKeys, record: input })
  const metadataText = getFirstStringValue({
    keys: diffInputKeys,
    record: metadata,
  })
  const candidates = [inputText, metadataText, output]

  return (
    candidates.find(
      (candidate) => candidate && isInternRunDiffText(candidate),
    ) ?? null
  )
}

export const getInternRunToolDiff = ({
  input,
  metadata,
  output,
  tool,
}: {
  input: Record<string, unknown>
  metadata: Record<string, unknown> | null
  output: string | null
  tool: string
}) => {
  if (patchToolNames.includes(tool)) {
    return getDiffText({ input, metadata, output })
  }

  if (tool !== "edit") {
    return null
  }

  const existingDiff = getDiffText({ input, metadata, output })

  if (existingDiff) {
    return existingDiff
  }

  const before = getFirstStringValue({ keys: editBeforeKeys, record: input })
  const after = getFirstStringValue({ keys: editAfterKeys, record: input })

  if (!before || !after) {
    return null
  }

  const filePath =
    getInternRunRecordStringValue({ key: "filePath", record: input }) ??
    getInternRunRecordStringValue({ key: "file_path", record: input }) ??
    getInternRunRecordStringValue({ key: "path", record: input })

  return buildEditDiff({ after, before, filePath })
}
