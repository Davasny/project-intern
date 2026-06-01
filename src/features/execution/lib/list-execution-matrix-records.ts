import { asc, eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

type ListExecutionMatrixRecordsParams = {
  projectId: string
}

export const listExecutionMatrixRecords = async ({
  projectId,
}: ListExecutionMatrixRecordsParams) =>
  db
    .select({
      id: recordTable.id,
      name: recordTable.name,
    })
    .from(recordTable)
    .where(eq(recordTable.projectId, projectId))
    .orderBy(asc(recordTable.name), asc(recordTable.id))
