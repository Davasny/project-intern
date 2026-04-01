import { writeFile } from "node:fs/promises"
import path, { dirname } from "node:path"
import { getArtifactManifestPath } from "@/features/artifacts/lib/get-artifact-manifest-path"
import { getArtifactStorageDirectory } from "@/features/artifacts/lib/get-artifact-storage-directory"
import {
  artifactEntrySchema,
  artifactManifestSchema,
} from "@/features/artifacts/schemas/artifact-entry"
import { createSha256Hash } from "@/utils/create-sha256-hash"
import { ensureDirectory } from "@/utils/ensure-directory"
import { pathExists } from "@/utils/path-exists"
import { readJsonFile } from "@/utils/read-json-file"
import { writeJsonFile } from "@/utils/write-json-file"

type PutArtifactParams = {
  contentBase64: string
  fileName: string
  idempotencyKey: string
  metadata: Record<string, unknown>
  mimeType: string
  pipelineVersion: string
  projectId: string
  recordId: string
  stage: string
}

export const putArtifact = async ({
  contentBase64,
  fileName,
  idempotencyKey,
  metadata,
  mimeType,
  pipelineVersion,
  projectId,
  recordId,
  stage,
}: PutArtifactParams) => {
  const manifestPath = getArtifactManifestPath({ projectId, recordId })
  const artifactDirectory = getArtifactStorageDirectory({ projectId, recordId })

  await ensureDirectory(dirname(manifestPath))
  await ensureDirectory(artifactDirectory)

  const existingManifest = (await pathExists(manifestPath))
    ? await readJsonFile({
        filePath: manifestPath,
        schema: artifactManifestSchema,
      })
    : { artifacts: [] }

  const existingArtifact =
    existingManifest.artifacts.find(
      (artifact) => artifact.idempotencyKey === idempotencyKey,
    ) ?? null

  if (existingArtifact) {
    return existingArtifact
  }

  const buffer = Buffer.from(contentBase64, "base64")
  const artifactId = crypto.randomUUID()
  const storagePath = path.join(artifactDirectory, `${artifactId}-${fileName}`)

  await writeFile(storagePath, buffer)

  const artifact = artifactEntrySchema.parse({
    createdAt: new Date().toISOString(),
    fileName,
    id: artifactId,
    idempotencyKey,
    metadata,
    mimeType,
    pipelineVersion,
    sha256: createSha256Hash(buffer),
    sizeBytes: buffer.byteLength,
    stage,
    storagePath,
    updatedAt: new Date().toISOString(),
  })

  const manifest = artifactManifestSchema.parse({
    artifacts: [...existingManifest.artifacts, artifact],
  })

  await writeJsonFile({
    filePath: manifestPath,
    value: manifest,
  })

  return artifact
}
