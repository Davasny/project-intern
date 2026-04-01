import { TRPCError } from "@trpc/server"
import { listRecordFiles } from "@/features/files/lib/list-record-files"

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
  const files = await listRecordFiles({ projectId, recordId })
  const file = files.find((currentFile) => currentFile.id === fileId) ?? null

  if (!file) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "File was not found.",
    })
  }

  return file
}
