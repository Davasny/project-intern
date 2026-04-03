import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { artifactTable } from "@/features/artifacts/db"
import { createArtifactStoragePath } from "@/features/artifacts/lib/create-artifact-storage-path"
import { getReusableArtifact } from "@/features/artifacts/lib/get-reusable-artifact"
import { resolveArtifactStoragePath } from "@/features/artifacts/lib/resolve-artifact-storage-path"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

type PutArtifactParams = {
  contentBase64: string
  filePath: string
  fileName: string
  idempotencyKey: string
  metadata: Record<string, unknown>
  mimeType: string
  projectId: string
  recordId: string
  sourceHash: string
  stage: string
  userId: string | null
}

export const putArtifact = async ({
  contentBase64,
  filePath,
  fileName,
  idempotencyKey,
  metadata,
  mimeType,
  projectId,
  recordId,
  sourceHash,
  stage,
  userId,
}: PutArtifactParams) => {
  const buffer = Buffer.from(contentBase64, "base64")
  const scope = await db
    .select({
      organizationId: projectTable.organizationId,
    })
    .from(recordTable)
    .innerJoin(projectTable, eq(projectTable.id, recordTable.projectId))
    .where(
      and(eq(recordTable.id, recordId), eq(recordTable.projectId, projectId)),
    )
    .then((rows) => rows[0] ?? null)

  if (!scope) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record was not found for this artifact.",
    })
  }

  const existingArtifact = await getReusableArtifact({
    filePath,
    recordId,
    sourceHash,
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
    organizationId: scope.organizationId,
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
      filePath,
      fileName: sanitizedFileName,
      format,
      metadata: {
        ...metadata,
        idempotencyKey,
      },
      mimeType,
      organizationId: scope.organizationId,
      projectId,
      recordId,
      sizeBytes: buffer.byteLength,
      sourceHash,
      stage,
      state: "available",
      storagePath,
    })
    .returning()

  return artifact
}
