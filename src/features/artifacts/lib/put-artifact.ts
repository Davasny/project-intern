import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { artifactTable } from "@/features/artifacts/db"
import { createArtifactStoragePath } from "@/features/artifacts/lib/create-artifact-storage-path"
import { getReusableArtifact } from "@/features/artifacts/lib/get-reusable-artifact"
import { resolveArtifactStoragePath } from "@/features/artifacts/lib/resolve-artifact-storage-path"
import { sourceFileTable } from "@/features/files/db"
import { db } from "@/lib/db"

type PutArtifactParams = {
  contentBase64: string
  fileId: string
  fileName: string
  idempotencyKey: string
  metadata: Record<string, unknown>
  mimeType: string
  projectId: string
  recordId: string
  stage: string
  userId: string | null
}

export const putArtifact = async ({
  contentBase64,
  fileId,
  fileName,
  idempotencyKey,
  metadata,
  mimeType,
  projectId,
  recordId,
  stage,
  userId,
}: PutArtifactParams) => {
  const buffer = Buffer.from(contentBase64, "base64")
  const sourceFile = await db
    .select({
      id: sourceFileTable.id,
      organizationId: sourceFileTable.organizationId,
      projectId: sourceFileTable.projectId,
      recordId: sourceFileTable.recordId,
      sha256: sourceFileTable.sha256,
    })
    .from(sourceFileTable)
    .where(
      and(
        eq(sourceFileTable.id, fileId),
        eq(sourceFileTable.projectId, projectId),
        eq(sourceFileTable.recordId, recordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!sourceFile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Source file was not found for this artifact.",
    })
  }

  const existingArtifact = await getReusableArtifact({
    fileId,
    recordId,
    sourceHash: sourceFile.sha256,
    stage,
  })

  if (existingArtifact) {
    return existingArtifact
  }

  const artifactId = crypto.randomUUID()
  const sanitizedFileName = path.basename(fileName)
  const extension = path.extname(sanitizedFileName) || `.${stage}`
  const storagePath = createArtifactStoragePath({
    artifactId,
    extension,
    organizationId: sourceFile.organizationId,
    projectId,
    stage,
  })
  const absoluteStoragePath = resolveArtifactStoragePath({ storagePath })

  await mkdir(path.dirname(absoluteStoragePath), { recursive: true })
  await writeFile(absoluteStoragePath, buffer)

  const format = path.extname(sanitizedFileName).replace(".", "") || mimeType

  const [artifact] = await db
    .insert(artifactTable)
    .values({
      createdByUserId: userId,
      fileId,
      fileName: sanitizedFileName,
      format,
      metadata: {
        ...metadata,
        idempotencyKey,
      },
      mimeType,
      organizationId: sourceFile.organizationId,
      projectId,
      recordId,
      sizeBytes: buffer.byteLength,
      sourceHash: sourceFile.sha256,
      stage,
      state: "available",
      storagePath,
    })
    .returning()

  return artifact
}
