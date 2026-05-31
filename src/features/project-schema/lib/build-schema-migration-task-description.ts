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
    "## Required decision before any patch tool call",
    "1. Compare the current record values with the target schema.",
    "2. Decide whether any existing record value must change to satisfy the target schema.",
    "3. If no record value must change, do not call `crm_record_propose_patch` or `crm_record_apply_patch`. Complete the task with `crm_record_complete_task` and `patch: null`.",
    `4. If the record is already at schema v${nextVersion}, treat that as a successful schema-only migration and complete with \`crm_record_complete_task\` and \`patch: null\`.`,
    "5. Only call a patch tool when you must change `name` or a schema-backed context field value.",
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
    "## Patch rules",
    "- A patch edits record values only. It does not update `schemaVersion`.",
    "- Valid patch targets are `name` and schema-backed context fields.",
    "- Adding a new optional field usually does not require a patch when the record has no existing value to migrate into that field.",
    "- Do not create a patch only to set a newly added optional field to `null`.",
    "- If no record values need to change, complete the task with `patch: null`.",
    "- When you do send a patch, `baseVersion` must equal the current record `version`.",
    "- If you cannot produce a valid patch or valid completion payload, call `crm_record_fail_task` instead of retrying the same invalid tool call.",
    "",
    "## Execution algorithm",
    "1. Read the current record envelope and use the current record `version` if you need a patch.",
    "2. Check record context for reusable values.",
    "3. Check artifacts for reusable values only if context is insufficient.",
    "4. Check source files only if both earlier sources are insufficient.",
    "5. Decide one of two outcomes:",
    "   - Outcome A: no record values must change -> call `crm_record_complete_task` with `patch: null`.",
    "   - Outcome A1: the record is already on the target schema version -> call `crm_record_complete_task` with `patch: null` and explain that it was already migrated.",
    "   - Outcome B: record values must change -> build one valid patch using the current record `version` as `baseVersion`, then complete the task.",
    "",
    "## Success examples",
    "Schema-only migration example:",
    "```json",
    "{",
    '  "execution": { "internRunId": "...", "projectId": "...", "recordId": "...", "taskId": "...", "workRecordId": "..." },',
    '  "patch": null,',
    '  "resultPayload": {',
    '    "outcome": "schema-only-migration",',
    '    "reason": "Target schema added only optional fields and no existing record values needed to change."',
    "  }",
    "}",
    "```",
    "",
    "Value migration example:",
    "```json",
    "{",
    '  "execution": { "internRunId": "...", "projectId": "...", "recordId": "...", "taskId": "...", "workRecordId": "..." },',
    '  "patch": {',
    '    "recordId": "...",',
    '    "baseVersion": 3,',
    '    "changes": [',
    "      {",
    '        "field": "newField",',
    '        "op": "set",',
    '        "value": "migrated value",',
    '        "reason": "Mapped existing source value into the new schema field.",',
    '        "sources": ["record.context.oldField"]',
    "      }",
    "    ]",
    "  },",
    '  "resultPayload": {',
    '    "outcome": "value-migration",',
    '    "reason": "Migrated existing record data into the target schema."',
    "  }",
    "}",
    "```",
    "",
    "## Tool error recovery",
    "- If a tool returns a validation error, correct the arguments once if you know the exact fix.",
    "- If the same validation error happens again, stop retrying and call `crm_record_fail_task`.",
    "- Never repeat the same invalid patch payload.",
    "",
    "## Expected outcome",
    "Return a validated patch only when record values must change to satisfy the target schema. Otherwise complete the task with `patch: null` and a result payload that explains no data changes were needed.",
  ].join("\n")
}
