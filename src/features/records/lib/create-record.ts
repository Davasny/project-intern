import { TRPCError } from "@trpc/server"
import { getActiveProjectSchemaVersion } from "@/features/project-schema/lib/get-active-project-schema-version"
import { recordTable } from "@/features/records/db"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import type { RecordInput } from "@/features/records/schemas/record-input"
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
  const activeSchemaVersion = await getActiveProjectSchemaVersion({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!activeSchemaVersion.project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const context = validateRecordContext({
    context: input.context,
    schemaDefinition: activeSchemaVersion.schemaDefinition,
  })

  const [record] = await db
    .insert(recordTable)
    .values({
      context,
      name: input.name,
      projectId: activeSchemaVersion.project.id,
      schemaVersion: activeSchemaVersion.version,
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

  return record
}
