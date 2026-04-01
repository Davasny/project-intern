import { z } from "zod"

export const sourceFileSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.string().uuid(),
  mimeType: z.string().trim().min(1),
  originalFileName: z.string().trim().min(1),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  sha256: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  storagePath: z.string().trim().min(1),
  updatedAt: z.coerce.date(),
})

export type SourceFile = z.infer<typeof sourceFileSchema>
