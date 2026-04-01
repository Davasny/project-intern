import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { sourceFileTable } from "@/features/files/db"
import { createSourceFileStoragePath } from "@/features/files/lib/create-source-file-storage-path"
import { resolveSourceFileStoragePath } from "@/features/files/lib/resolve-source-file-storage-path"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"
import { createSha256Hash } from "@/utils/create-sha256-hash"

type CreateSourceFileParams = {
  contentBase64: string
  mimeType: string
  organizationSlug: string
  originalFileName: string
  projectSlug: string
  recordId: string
  userId: string
}

export const createSourceFile = async ({
  contentBase64,
  mimeType,
  organizationSlug,
  originalFileName,
  projectSlug,
  recordId,
  userId,
}: CreateSourceFileParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const record = await db
    .select({ id: recordTable.id })
    .from(recordTable)
    .where(
      and(eq(recordTable.id, recordId), eq(recordTable.projectId, project.id)),
    )
    .then((rows) => rows[0] ?? null)

  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record was not found.",
    })
  }

  const fileId = crypto.randomUUID()
  const buffer = Buffer.from(contentBase64, "base64")
  const sanitizedOriginalFileName = path.basename(originalFileName)
  const storagePath = createSourceFileStoragePath({
    fileId,
    organizationId: project.organizationId,
    originalFileName: sanitizedOriginalFileName,
    projectId: project.id,
  })
  const absoluteStoragePath = resolveSourceFileStoragePath({ storagePath })

  await mkdir(path.dirname(absoluteStoragePath), { recursive: true })
  await writeFile(absoluteStoragePath, buffer)

  const [sourceFile] = await db
    .insert(sourceFileTable)
    .values({
      createdByUserId: userId,
      mimeType,
      organizationId: project.organizationId,
      originalFileName: sanitizedOriginalFileName,
      projectId: project.id,
      recordId,
      sha256: createSha256Hash(buffer),
      sizeBytes: buffer.byteLength,
      storagePath,
    })
    .returning()

  return sourceFile
}
