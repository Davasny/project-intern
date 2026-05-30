import { z } from "zod"

const taskExportSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  descriptionMarkdown: z.string(),
  model: z.string().trim().min(1).nullable(),
  temperature: z.number().nullable(),
  sortOrder: z.number().int().positive(),
  state: z.string().trim().min(1),
  schemaVersion: z.number().int().min(1),
  sourceSchemaVersionId: z.string().uuid().nullable(),
  targetSchemaVersionId: z.string().uuid().nullable(),
})

const recordExportSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  context: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int().min(1),
})

const schemaVersionExportSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().min(1),
  state: z.string().trim().min(1),
  schemaDefinition: z.object({
    fields: z.array(
      z.object({
        config: z.object({
          enumOptions: z.array(z.string()).default([]),
          max: z.number().finite().nullable().default(null),
          min: z.number().finite().nullable().default(null),
          multilineRows: z.number().int().positive().nullable().default(null),
        }),
        defaultValue: z.unknown().nullable(),
        description: z.string().trim(),
        key: z.string().trim().min(1),
        label: z.string().trim().min(1),
        required: z.boolean(),
        type: z.string().trim().min(1),
        isSystem: z.boolean(),
      }),
    ),
  }),
  parentVersionId: z.string().uuid().nullable(),
})

const projectSettingsExportSchema = z.object({
  defaultModel: z.string().trim().min(1),
  defaultTemperature: z.number(),
  agentPythonRequirements: z.string(),
  isAutopickEnabled: z.boolean(),
})

export const projectExportDataSchema = z.object({
  formatVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  source: z.object({
    organizationSlug: z.string().trim().min(1),
    projectSlug: z.string().trim().min(1),
  }),
  data: z.object({
    tasks: z.array(taskExportSchema).optional(),
    records: z.array(recordExportSchema).optional(),
    schemaVersions: z.array(schemaVersionExportSchema).optional(),
    projectSettings: projectSettingsExportSchema.optional(),
  }),
})

export const projectExportRequestSchema = z.object({
  exportTasks: z.boolean(),
  exportRecords: z.boolean(),
  exportSchemaVersions: z.boolean(),
  exportProjectSettings: z.boolean(),
})

const importWarningSchema = z.object({
  entityType: z.enum(["task", "record", "schema_version"]),
  name: z.string().trim().min(1),
  message: z.string().trim().min(1),
})

const importSummarySchema = z.object({
  tasksFound: z.number().int().nonnegative(),
  recordsFound: z.number().int().nonnegative(),
  schemaVersionsFound: z.number().int().nonnegative(),
  hasProjectSettings: z.boolean(),
})

export const projectImportPreviewResultSchema = z.object({
  summary: importSummarySchema,
  warnings: z.array(importWarningSchema),
  data: projectExportDataSchema.shape.data,
})

export const projectImportCommitInputSchema = z.object({
  data: projectExportDataSchema.shape.data,
})

export type ProjectExportData = z.infer<typeof projectExportDataSchema>
export type ProjectExportRequest = z.infer<typeof projectExportRequestSchema>
export type ProjectImportPreviewResult = z.infer<
  typeof projectImportPreviewResultSchema
>
export type ProjectImportCommitInput = z.infer<
  typeof projectImportCommitInputSchema
>
export type TaskExport = z.infer<typeof taskExportSchema>
export type RecordExport = z.infer<typeof recordExportSchema>
export type SchemaVersionExport = z.infer<typeof schemaVersionExportSchema>
export type ProjectSettingsExport = z.infer<typeof projectSettingsExportSchema>
export type ImportWarning = z.infer<typeof importWarningSchema>
