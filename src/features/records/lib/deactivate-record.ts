import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { db } from "@/lib/db"

type DeactivateRecordParams = {
  projectId: string
  recordId: string
}

export const deactivateRecord = async ({
  projectId,
  recordId,
}: DeactivateRecordParams) => {
  const record = await getScopedRecord({ projectId, recordId })

  if (record.state !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only active records can be deactivated.",
    })
  }

  const [updatedRecord] = await db
    .update(recordTable)
    .set({ state: "inactive" })
    .where(
      and(eq(recordTable.id, recordId), eq(recordTable.projectId, projectId)),
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
      code: "NOT_FOUND",
      message: "Record was not found.",
    })
  }

  return updatedRecord
}
