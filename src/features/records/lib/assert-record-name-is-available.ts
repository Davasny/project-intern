import { TRPCError } from "@trpc/server"
import { and, eq, ne } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

type AssertRecordNameIsAvailableParams = {
  excludedRecordId: string | null
  name: string
  projectId: string
}

export const assertRecordNameIsAvailable = async ({
  excludedRecordId,
  name,
  projectId,
}: AssertRecordNameIsAvailableParams) => {
  const normalizedName = name.trim()

  const whereClause =
    excludedRecordId === null
      ? and(
          eq(recordTable.projectId, projectId),
          eq(recordTable.name, normalizedName),
        )
      : and(
          eq(recordTable.projectId, projectId),
          eq(recordTable.name, normalizedName),
          ne(recordTable.id, excludedRecordId),
        )

  const existingRecord = await db
    .select({ id: recordTable.id })
    .from(recordTable)
    .where(whereClause)
    .then((rows) => rows[0] ?? null)

  if (existingRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Record name "${normalizedName}" already exists in this project.`,
    })
  }

  return normalizedName
}
