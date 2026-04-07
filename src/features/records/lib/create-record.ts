import { TRPCError } from "@trpc/server"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { assertRecordNameIsAvailable } from "@/features/records/lib/assert-record-name-is-available"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import type { RecordInput } from "@/features/records/schemas/record-input"
import { backfillTaskRecordsForRecord } from "@/features/task-records/lib/backfill-task-records-for-record"
import { db } from "@/lib/db"

type CreateRecordParams = {
  input: RecordInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createRecord = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: CreateRecordParams) => {
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

  const normalizedName = await assertRecordNameIsAvailable({
    excludedRecordId: null,
    name: input.name,
    projectId: project.id,
  })

  const context = validateRecordContext({
    context: input.context,
    schemaDefinition: initialSchemaVersion.schemaDefinition,
  })

  const [record] = await db
    .insert(recordTable)
    .values({
      context,
      name: normalizedName,
      projectId: project.id,
      schemaVersion: initialSchemaVersion.version,
      state: "active",
    })
    .returning({
      context: recordTable.context,
      createdAt: recordTable.createdAt,
      id: recordTable.id,
      name: recordTable.name,
      schemaVersion: recordTable.schemaVersion,
      state: recordTable.state,
      updatedAt: recordTable.updatedAt,
      version: recordTable.version,
    })

  await backfillTaskRecordsForRecord({
    projectId: project.id,
    recordId: record.id,
  })

  return record
}
