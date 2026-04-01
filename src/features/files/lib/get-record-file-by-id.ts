import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { sourceFileTable } from "@/features/files/db"
import { db } from "@/lib/db"

type GetRecordFileByIdParams = {
  fileId: string
  projectId: string
  recordId: string
}

export const getRecordFileById = async ({
  fileId,
  projectId,
  recordId,
}: GetRecordFileByIdParams) => {
  const file = await db
    .select()
    .from(sourceFileTable)
    .where(
      and(
        eq(sourceFileTable.id, fileId),
        eq(sourceFileTable.projectId, projectId),
        eq(sourceFileTable.recordId, recordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!file) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "File was not found.",
    })
  }

  return file
}
