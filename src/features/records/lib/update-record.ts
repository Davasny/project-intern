import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
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

  const record = await getScopedRecord({
    projectId: project.id,
    recordId: input.recordId,
  })
  const recordSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId: project.id,
    version: record.schemaVersion,
  })

  const context = validateRecordContext({
    context: input.context,
    schemaDefinition: recordSchemaVersion.schemaDefinition,
  })

  const [updatedRecord] = await db
    .update(recordTable)
    .set({
      context,
      name: input.name,
      version: input.version + 1,
    })
    .where(
      and(
        eq(recordTable.id, input.recordId),
        eq(recordTable.projectId, project.id),
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

  if (!updatedRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Record update conflict. Refresh and try again.",
    })
  }

  return updatedRecord
}
