import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

type EnsureRecordInProjectParams = {
  projectId: string
  recordId: string
}

export const ensureRecordInProject = async ({
  projectId,
  recordId,
}: EnsureRecordInProjectParams) => {
  const record = await db
    .select({
      context: recordTable.context,
      id: recordTable.id,
      name: recordTable.name,
      projectId: recordTable.projectId,
      schemaVersion: recordTable.schemaVersion,
      state: recordTable.state,
    })
    .from(recordTable)
    .where(
      and(eq(recordTable.id, recordId), eq(recordTable.projectId, projectId)),
    )
    .then((rows) => rows[0] ?? null)

  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record was not found in the selected project.",
    })
  }

  return record
}
