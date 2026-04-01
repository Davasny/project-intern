import { diffProjectSchemaVersions } from "@/features/project-schema/lib/diff-project-schema-versions"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

type BuildSchemaMigrationTaskDescriptionParams = {
  nextSchemaDefinition: ProjectSchemaDefinition
  nextVersion: number
  previousSchemaDefinition: ProjectSchemaDefinition
  previousVersion: number
}

const formatField = (field: ProjectSchemaDefinition["fields"][number]) =>
  `- \`${field.key}\` (${field.type}, ${field.required ? "required" : "optional"})`

export const buildSchemaMigrationTaskDescription = ({
  nextSchemaDefinition,
  nextVersion,
  previousSchemaDefinition,
  previousVersion,
}: BuildSchemaMigrationTaskDescriptionParams) => {
  const diffs = diffProjectSchemaVersions(
    previousSchemaDefinition,
    nextSchemaDefinition,
  )

  const diffLines =
    diffs.length === 0
      ? ["- No field differences were detected."]
      : diffs.map((diff) => {
          const previousField = diff.before
          const nextField = diff.after

          if (diff.changeType === "added" && nextField) {
            return `- Added \`${nextField.key}\` (${nextField.type})`
          }

          if (diff.changeType === "removed" && previousField) {
            return `- Removed \`${previousField.key}\``
          }

          return `- Changed \`${diff.key}\``
        })

  return [
    `# Adopt schema v${nextVersion}`,
    "",
    `Migrate this record from schema v${previousVersion} to schema v${nextVersion}.`,
    "",
    "## Migration priorities",
    "1. Reuse existing record context first.",
    "2. Reuse existing persistent artifacts second.",
    "3. Read source files only when the first two sources are insufficient.",
    "",
    "## Schema diff summary",
    ...diffLines,
    "",
    `## Previous schema v${previousVersion}`,
    ...previousSchemaDefinition.fields.map(formatField),
    "",
    `## Target schema v${nextVersion}`,
    ...nextSchemaDefinition.fields.map(formatField),
    "",
    "## Expected outcome",
    "Return a validated patch that updates this record to the target schema and preserves correct existing values where possible.",
  ].join("\n")
}
