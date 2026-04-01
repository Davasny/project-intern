import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

type GetScopedRecordParams = {
  projectId: string
  recordId: string
}

export const getScopedRecord = async ({
  projectId,
  recordId,
}: GetScopedRecordParams) => {
  const record = await db
    .select({
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
    .from(recordTable)
    .where(
      and(eq(recordTable.projectId, projectId), eq(recordTable.id, recordId)),
    )
    .then((rows) => rows[0] ?? null)

  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record was not found.",
    })
  }

  return record
}
