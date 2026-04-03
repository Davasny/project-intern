import { z } from "zod"

export const artifactSchema = z.object({
  createdAt: z.coerce.date(),
  filePath: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  format: z.string().trim().min(1),
  id: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()),
  mimeType: z.string().trim().min(1),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  sizeBytes: z.number().int().nonnegative(),
  sourceHash: z.string().trim().min(1),
  stage: z.string().trim().min(1),
  state: z.enum(["registered", "available", "invalidated", "superseded"]),
  storagePath: z.string().trim().min(1),
  updatedAt: z.coerce.date(),
})

export type Artifact = z.infer<typeof artifactSchema>
