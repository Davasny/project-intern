import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { backfillWorkRecordsForRecord } from "@/features/work-records/lib/backfill-work-records-for-record"
import { db } from "@/lib/db"

type ActivateRecordParams = {
  projectId: string
  recordId: string
}

export const activateRecord = async ({
  projectId,
  recordId,
}: ActivateRecordParams) => {
  const record = await getScopedRecord({ projectId, recordId })

  if (record.state !== "inactive") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only inactive records can be activated.",
    })
  }

  const [updatedRecord] = await db
    .update(recordTable)
    .set({ state: "active" })
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

  await backfillWorkRecordsForRecord({
    projectId,
    recordId: updatedRecord.id,
  })

  return updatedRecord
}
