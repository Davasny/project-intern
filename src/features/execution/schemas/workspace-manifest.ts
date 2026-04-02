import { z } from "zod"

export const workspaceManifestSchema = z.object({
  artifacts: z.array(
    z.object({
      artifactId: z.string().uuid(),
      sourceHash: z.string().trim().min(1),
      stage: z.string().trim().min(1),
      workspacePath: z.string().trim().min(1),
    }),
  ),
  files: z.array(
    z.object({
      fileId: z.string().uuid(),
      originalFileName: z.string().trim().min(1),
      sha256: z.string().trim().min(1),
      workspacePath: z.string().trim().min(1),
    }),
  ),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  updatedAt: z.string().datetime(),
})

export type WorkspaceManifest = z.infer<typeof workspaceManifestSchema>
