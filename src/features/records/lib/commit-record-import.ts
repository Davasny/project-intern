import { TRPCError } from "@trpc/server"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { validateRecordImportCandidates } from "@/features/records/lib/validate-record-import-candidates"
import type { RecordImportCommitInput } from "@/features/records/schemas/record-import"
import { db } from "@/lib/db"

type CommitRecordImportParams = {
  input: RecordImportCommitInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

const buildErrorMessageFromValidationErrors = (
  errors: Array<{ message: string; rowNumber: number | null }>,
) => {
  const firstFiveErrors = errors.slice(0, 5)

  return firstFiveErrors
    .map((error) => {
      if (error.rowNumber === null) {
        return error.message
      }

      return `Row ${error.rowNumber}: ${error.message}`
    })
    .join(" ")
}

export const commitRecordImport = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: CommitRecordImportParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const initialSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId: project.id,
    version: 1,
  })

  const validationResult = await validateRecordImportCandidates({
    projectId: project.id,
    schemaDefinition: initialSchemaVersion.schemaDefinition,
    sourceRecords: input.records,
  })

  if (validationResult.errors.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: buildErrorMessageFromValidationErrors(validationResult.errors),
    })
  }

  let createdRecords: Array<{ id: string; name: string }> = []

  try {
    createdRecords = await db.transaction(async (transaction) => {
      const insertedRecords: Array<{ id: string; name: string }> = []

      for (const record of validationResult.validRecords) {
        const [insertedRecord] = await transaction
          .insert(recordTable)
          .values({
            context: record.context,
            name: record.name,
            projectId: project.id,
            schemaVersion: initialSchemaVersion.version,
            state: "inactive",
          })
          .returning({
            id: recordTable.id,
            name: recordTable.name,
          })

        if (insertedRecord) {
          insertedRecords.push(insertedRecord)
        }
      }

      return insertedRecords
    })
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Import failed due to duplicate record names. Refresh and run preview again.",
    })
  }

  return {
    createdCount: createdRecords.length,
  }
}
