import { and, asc, eq } from "drizzle-orm"
import { sourceFileTable } from "@/features/files/db"
import { db } from "@/lib/db"

type ListRecordFilesParams = {
  projectId: string
  recordId: string
}

export const listRecordFiles = async ({
  projectId,
  recordId,
}: ListRecordFilesParams) => {
  return db
    .select()
    .from(sourceFileTable)
    .where(
      and(
        eq(sourceFileTable.projectId, projectId),
        eq(sourceFileTable.recordId, recordId),
      ),
    )
    .orderBy(asc(sourceFileTable.createdAt))
}
