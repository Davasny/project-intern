import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { TRPCError } from "@trpc/server"
import { getRecordFilePreviewLanguage } from "@/features/files/lib/record-file-preview-language"
import { getRecordDataDirectory } from "@/lib/storage/get-record-data-directory"
import { resolvePathInsideDirectory } from "@/lib/storage/resolve-path-inside-directory"

type ReadRecordFilePreviewParams = {
  organizationId: string
  projectId: string
  recordId: string
  filePath: string
}

const maxPreviewBytes = 1_000_000

const decodeUtf8Text = (buffer: Buffer) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer)
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This file is not a supported text file.",
    })
  }
}

export const readRecordFilePreview = async ({
  organizationId,
  projectId,
  recordId,
  filePath,
}: ReadRecordFilePreviewParams) => {
  const language = getRecordFilePreviewLanguage(filePath)

  if (language === null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Preview is available only for supported text-like files.",
    })
  }

  const recordDataDirectory = getRecordDataDirectory({
    organizationId,
    projectId,
    recordId,
  })
  let absoluteFilePath: string

  try {
    absoluteFilePath = resolvePathInsideDirectory({
      baseDirectory: recordDataDirectory,
      relativePath: filePath,
    })
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File path is not valid.",
    })
  }

  let fileStats: Awaited<ReturnType<typeof stat>>

  try {
    fileStats = await stat(absoluteFilePath)
  } catch {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "File could not be found.",
    })
  }

  if (!fileStats.isFile()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Preview is available only for files.",
    })
  }

  if (fileStats.size > maxPreviewBytes) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File is too large to preview in the browser.",
    })
  }

  let buffer: Buffer

  try {
    buffer = await readFile(absoluteFilePath)
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "File preview could not be loaded.",
    })
  }

  const content = decodeUtf8Text(buffer)

  return {
    content,
    language,
    name: path.basename(filePath),
    path: filePath,
    sizeBytes: fileStats.size,
    updatedAt: fileStats.mtime,
  }
}
