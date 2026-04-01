import { z } from "zod"

export const recordFileEntrySchema = z.object({
  createdAt: z.string().datetime(),
  fileName: z.string().trim().min(1),
  id: z.string().uuid(),
  mimeType: z.string().trim().min(1),
  sha256: z.string().trim().min(1).nullable(),
  sizeBytes: z.number().int().nonnegative(),
  storagePath: z.string().trim().min(1),
  updatedAt: z.string().datetime(),
})

export const recordFileManifestSchema = z.object({
  files: z.array(recordFileEntrySchema),
})

export type RecordFileEntry = z.infer<typeof recordFileEntrySchema>
