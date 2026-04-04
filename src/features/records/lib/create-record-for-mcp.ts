import { TRPCError } from "@trpc/server"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { recordTable } from "@/features/records/db"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import type { RecordInput } from "@/features/records/schemas/record-input"
import { backfillTaskRecordsForRecord } from "@/features/task-records/lib/backfill-task-records-for-record"
import { db } from "@/lib/db"
import { assertMcpOrgOwnsProject } from "@/lib/mcp/assert-mcp-org-owns-project"

type CreateRecordForMcpParams = {
  context: RecordInput["context"]
  name: RecordInput["name"]
  projectId: string
}

export const createRecordForMcp = async ({
  context,
  name,
  projectId,
}: CreateRecordForMcpParams) => {
  await assertMcpOrgOwnsProject({ projectId })

  const initialSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId,
    version: 1,
  })

  const validatedContext = validateRecordContext({
    context,
    schemaDefinition: initialSchemaVersion.schemaDefinition,
  })

  const [record] = await db
    .insert(recordTable)
    .values({
      context: validatedContext,
      name,
      projectId,
      schemaVersion: initialSchemaVersion.version,
      state: "active",
    })
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

  if (!record) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create record.",
    })
  }

  await backfillTaskRecordsForRecord({
    projectId,
    recordId: record.id,
  })

  return record
}
