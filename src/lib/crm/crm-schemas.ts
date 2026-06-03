import { z } from "zod"
import { taskFailureSchema } from "@/features/execution/schemas/task-failure"
import { projectSchemaDefinitionSchema } from "@/features/project-schema/schemas/project-schema-version"

const executionScopeInputSchema = z.object({
  internRunId: z.string().uuid(),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  taskId: z.string().uuid(),
  workRecordId: z.string().uuid(),
})

export const crmRecordReadInputSchema = executionScopeInputSchema

export type CrmRecordReadInput = z.infer<typeof crmRecordReadInputSchema>

export type CrmProjectReadSchemaInput = z.infer<typeof crmRecordReadInputSchema>

export const crmProjectSchemaProposeVersionInputSchema = z.object({
  projectId: z.string().uuid(),
  schemaDefinition: projectSchemaDefinitionSchema,
})

export type CrmProjectSchemaProposeVersionInput = z.infer<
  typeof crmProjectSchemaProposeVersionInputSchema
>

const crmProjectTaskProposalItemInputSchema = z.object({
  descriptionMarkdown: z
    .string()
    .trim()
    .min(1, "Task description is required."),
  title: z.string().trim().min(1, "Task title is required."),
})

export const crmProjectTaskProposeInputSchema = z.object({
  projectId: z.string().uuid(),
  tasks: z.array(crmProjectTaskProposalItemInputSchema).min(1),
})

export type CrmProjectTaskProposeInput = z.infer<
  typeof crmProjectTaskProposeInputSchema
>

const patchProposalSchema = z.object({
  baseVersion: z.number().int().positive(),
  changes: z.array(
    z.union([
      z.object({
        field: z.string().trim().min(1),
        op: z.literal("set"),
        reason: z.string().trim().min(1),
        sources: z.array(z.string().trim().min(1)).min(1),
        value: z.unknown(),
      }),
      z.object({
        field: z.string().trim().min(1),
        op: z.literal("unset"),
        reason: z.string().trim().min(1),
        sources: z.array(z.string().trim().min(1)).min(1),
      }),
    ]),
  ),
  recordId: z.string().uuid(),
})

export const crmRecordProposePatchInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema,
})

export const crmRecordPatchInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema,
})

export type CrmRecordProposePatchInput = z.infer<
  typeof crmRecordPatchInputSchema
>
export type CrmRecordApplyPatchInput = z.infer<typeof crmRecordPatchInputSchema>

const completionResultPayloadSchema = z
  .object({
    summary: z.string().trim().min(1, "Completion summary is required."),
  })
  .catchall(z.unknown())

const skipResultPayloadSchema = z
  .object({
    reason: z.string().trim().min(1, "Skip reason is required."),
  })
  .catchall(z.unknown())

export const crmRecordCompleteTaskInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema.nullable(),
  resultPayload: completionResultPayloadSchema,
})

export type CrmRecordCompleteTaskInput = z.infer<
  typeof crmRecordCompleteTaskInputSchema
>

export const crmRecordFailTaskInputSchema = z.object({
  execution: executionScopeInputSchema,
  failure: taskFailureSchema,
})

export type CrmRecordFailTaskInput = z.infer<
  typeof crmRecordFailTaskInputSchema
>

export const crmRecordSkipTaskInputSchema = z.object({
  execution: executionScopeInputSchema,
  resultPayload: skipResultPayloadSchema,
})

export type CrmRecordSkipTaskInput = z.infer<
  typeof crmRecordSkipTaskInputSchema
>

export const crmRecordListRelationsInputSchema = executionScopeInputSchema

export type CrmRecordListRelationsInput = z.infer<
  typeof crmRecordListRelationsInputSchema
>

export const crmRecordGetRelatedInputSchema = z.object({
  execution: executionScopeInputSchema,
  recordEdgeId: z.string().uuid(),
})

export type CrmRecordGetRelatedInput = z.infer<
  typeof crmRecordGetRelatedInputSchema
>

export const crmRecordGetRelatedRecordsInputSchema = executionScopeInputSchema

export type CrmRecordGetRelatedRecordsInput = z.infer<
  typeof crmRecordGetRelatedRecordsInputSchema
>

export const crmRecordCreateRelationEdgeInputSchema = z.object({
  direction: z.enum(["bidirectional", "outbound"]),
  execution: executionScopeInputSchema,
  idempotencyKey: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()),
  relationType: z.enum([
    "belongs_to",
    "depends_on",
    "duplicates",
    "related_to",
  ]),
  targetProjectId: z.string().uuid(),
  targetRecordId: z.string().uuid(),
})

export type CrmRecordCreateRelationEdgeInput = z.infer<
  typeof crmRecordCreateRelationEdgeInputSchema
>

export const crmRecordDeactivateRelationEdgeInputSchema = z.object({
  execution: executionScopeInputSchema,
  recordEdgeId: z.string().uuid(),
})

export type CrmRecordDeactivateRelationEdgeInput = z.infer<
  typeof crmRecordDeactivateRelationEdgeInputSchema
>

export const crmRecordCreateInputSchema = z.object({
  context: z.record(z.string(), z.unknown()),
  name: z.string().trim().min(1, "Record name is required."),
  projectId: z.string().uuid(),
})

export type CrmRecordCreateInput = z.infer<typeof crmRecordCreateInputSchema>

export const crmProjectListInputSchema = z.object({})

export type CrmProjectListInput = z.infer<typeof crmProjectListInputSchema>
