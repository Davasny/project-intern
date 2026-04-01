import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { getActiveProjectSchemaVersion } from "@/features/project-schema/lib/get-active-project-schema-version"
import { recordTable } from "@/features/records/db"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import type { RecordUpdateInput } from "@/features/records/schemas/record-input"
import { db } from "@/lib/db"

type UpdateRecordParams = {
  input: RecordUpdateInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const updateRecord = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: UpdateRecordParams) => {
  const activeSchemaVersion = await getActiveProjectSchemaVersion({
    organizationSlug,
    projectSlug,
    userId,
  })
  const context = validateRecordContext({
    context: input.context,
    schemaDefinition: activeSchemaVersion.schemaDefinition,
  })

  const [record] = await db
    .update(recordTable)
    .set({
      context,
      name: input.name,
      schemaVersion: activeSchemaVersion.version,
      version: input.version + 1,
    })
    .where(
      and(
        eq(recordTable.id, input.recordId),
        eq(recordTable.projectId, activeSchemaVersion.project.id),
        eq(recordTable.version, input.version),
      ),
    )
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

  if (!record) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Record update conflict. Refresh and try again.",
    })
  }

  return record
}
