import { z } from "zod"

export const workspaceManifestSchema = z.object({
  artifactIds: z.array(z.string().uuid()),
  fileIds: z.array(z.string().uuid()),
  pipelineVersion: z.string().trim().nullable(),
  recordId: z.string().uuid(),
  taskId: z.string().uuid(),
  updatedAt: z.string().datetime(),
})

export type WorkspaceManifest = z.infer<typeof workspaceManifestSchema>
