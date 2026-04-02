import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { recordTable } from "@/features/records/db"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import { db } from "@/lib/db"

type SyncRecordSchemaVersionParams = {
  projectId: string
  recordId: string
  schemaVersion: number
}

export const syncRecordSchemaVersion = async ({
  projectId,
  recordId,
  schemaVersion,
}: SyncRecordSchemaVersionParams) => {
  const record = await getScopedRecord({ projectId, recordId })

  if (record.schemaVersion === schemaVersion) {
    return record
  }

  const nextSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId,
    version: schemaVersion,
  })
  const validatedContext = validateRecordContext({
    context: record.context,
    schemaDefinition: nextSchemaVersion.schemaDefinition,
  })

  const [updatedRecord] = await db
    .update(recordTable)
    .set({
      context: validatedContext,
      schemaVersion,
      version: record.version + 1,
    })
    .where(
      and(
        eq(recordTable.id, record.id),
        eq(recordTable.version, record.version),
      ),
    )
    .returning({
      context: recordTable.context,
      createdAt: recordTable.createdAt,
      id: recordTable.id,
      name: recordTable.name,
      projectId: recordTable.projectId,
      schemaVersion: recordTable.schemaVersion,
      state: recordTable.state,
      updatedAt: recordTable.updatedAt,
      version: recordTable.version,
    })

  if (!updatedRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Record schema update conflict. Refresh and try again.",
    })
  }

  return updatedRecord
}
