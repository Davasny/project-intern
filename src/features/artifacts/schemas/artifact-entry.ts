import { z } from "zod"

export const artifactEntrySchema = z.object({
  createdAt: z.string().datetime(),
  fileName: z.string().trim().min(1),
  id: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()),
  mimeType: z.string().trim().min(1),
  pipelineVersion: z.string().trim().min(1),
  sha256: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  stage: z.string().trim().min(1),
  storagePath: z.string().trim().min(1),
  updatedAt: z.string().datetime(),
})

export const artifactManifestSchema = z.object({
  artifacts: z.array(artifactEntrySchema),
})

export type ArtifactEntry = z.infer<typeof artifactEntrySchema>
