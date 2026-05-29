import { z } from "zod"

export const recordImportPreviewInputSchema = z.object({
  csvContent: z.string().trim().min(1, "CSV content is required."),
})

const recordImportCandidateSchema = z.object({
  context: z.record(z.string(), z.unknown()),
  name: z.string().trim().min(1, "Record name is required."),
  rowNumber: z.number().int().positive(),
})

export const recordImportCommitInputSchema = z.object({
  records: z.array(recordImportCandidateSchema).min(1, "No records to import."),
})

const recordImportErrorSchema = z.object({
  field: z.string().trim().min(1).nullable(),
  message: z.string().trim().min(1),
  rowNumber: z.number().int().positive().nullable(),
})

const recordImportPreviewResultSchema = z.object({
  errors: z.array(recordImportErrorSchema),
  proposedRecords: z.array(recordImportCandidateSchema),
  summary: z.object({
    errorCount: z.number().int().nonnegative(),
    proposedCount: z.number().int().nonnegative(),
    totalRows: z.number().int().nonnegative(),
  }),
})

export type RecordImportCommitInput = z.infer<
  typeof recordImportCommitInputSchema
>
export type RecordImportError = z.infer<typeof recordImportErrorSchema>
export type RecordImportPreviewResult = z.infer<
  typeof recordImportPreviewResultSchema
>
