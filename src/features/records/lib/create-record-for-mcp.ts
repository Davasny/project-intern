import { TRPCError } from "@trpc/server"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { recordTable } from "@/features/records/db"
import { assertRecordNameIsAvailable } from "@/features/records/lib/assert-record-name-is-available"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import type { RecordInput } from "@/features/records/schemas/record-input"
import { db } from "@/lib/db"
import { assertMcpOrgOwnsProject } from "@/lib/mcp/assert-mcp-org-owns-project"

type CreateRecordForMcpParams = {
  context: RecordInput["context"]
  name: RecordInput["name"]
  organizationId: string
  projectId: string
}

export const createRecordForMcp = async ({
  context,
  name,
  organizationId,
  projectId,
}: CreateRecordForMcpParams) => {
  await assertMcpOrgOwnsProject({ organizationId, projectId })

  const initialSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId,
    version: 1,
  })

  const validatedContext = validateRecordContext({
    context,
    schemaDefinition: initialSchemaVersion.schemaDefinition,
  })

  const normalizedName = await assertRecordNameIsAvailable({
    excludedRecordId: null,
    name,
    projectId,
  })

  const [record] = await db
    .insert(recordTable)
    .values({
      context: validatedContext,
      name: normalizedName,
      projectId,
      schemaVersion: initialSchemaVersion.version,
      state: "inactive",
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

  return record
}
