import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { readRecordFilePreview } from "@/features/files/lib/read-record-file-preview"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { getRecordDataDirectory } from "@/lib/storage/get-record-data-directory"
import { listRecordFileTree } from "@/lib/storage/list-record-file-tree"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const filesRouter = router({
  list: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        return { nodes: [], storageRoot: null }
      }

      const [nodes, storageRoot] = await Promise.all([
        listRecordFileTree({
          organizationId: project.organizationId,
          projectId: project.id,
          recordId: input.recordId,
        }),
        Promise.resolve(
          getRecordDataDirectory({
            organizationId: project.organizationId,
            projectId: project.id,
            recordId: input.recordId,
          }),
        ),
      ])

      return { nodes, storageRoot }
    }),
  preview: protectedProcedure
    .input(
      projectScopeSchema.extend({
        path: z
          .string()
          .min(1)
          .refine((value) => !value.includes("\0"), {
            message: "File path is not valid.",
          }),
        recordId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      return readRecordFilePreview({
        filePath: input.path,
        organizationId: project.organizationId,
        projectId: project.id,
        recordId: input.recordId,
      })
    }),
})
