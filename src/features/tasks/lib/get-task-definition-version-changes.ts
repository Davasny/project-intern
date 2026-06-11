import type {
  TaskDefinitionVersionChange,
  TaskDefinitionVersionSource,
} from "@/features/tasks/lib/task-definition-version-types"

const formatNullable = (value: number | string | null) =>
  value === null ? "—" : String(value)

export const getTaskDefinitionVersionChanges = ({
  after,
  before,
}: {
  after: TaskDefinitionVersionSource
  before: TaskDefinitionVersionSource | null
}) => {
  if (!before) {
    return [] satisfies TaskDefinitionVersionChange[]
  }

  const candidates: TaskDefinitionVersionChange[] = [
    {
      after: after.title,
      before: before.title,
      field: "title",
      label: "Title",
    },
    {
      after: after.descriptionMarkdown,
      before: before.descriptionMarkdown,
      field: "descriptionMarkdown",
      label: "Description",
    },
    {
      after: formatNullable(after.model),
      before: formatNullable(before.model),
      field: "model",
      label: "Model",
    },
    {
      after: formatNullable(after.temperature),
      before: formatNullable(before.temperature),
      field: "temperature",
      label: "Temperature",
    },
    {
      after: String(after.schemaVersion),
      before: String(before.schemaVersion),
      field: "schemaVersion",
      label: "Schema version",
    },
    {
      after: formatNullable(after.sourceSchemaVersionId),
      before: formatNullable(before.sourceSchemaVersionId),
      field: "sourceSchemaVersionId",
      label: "Source schema",
    },
    {
      after: formatNullable(after.targetSchemaVersionId),
      before: formatNullable(before.targetSchemaVersionId),
      field: "targetSchemaVersionId",
      label: "Target schema",
    },
  ]

  return candidates.filter((change) => change.after !== change.before)
}
