import { z } from "zod"
import { createSourceFile } from "@/features/files/lib/create-source-file"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const filesRouter = router({
  create: protectedProcedure
    .input(
      projectScopeSchema.extend({
        contentBase64: z.string().trim().min(1),
        mimeType: z.string().trim().min(1),
        originalFileName: z.string().trim().min(1),
        recordId: z.string().uuid(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createSourceFile({
        contentBase64: input.contentBase64,
        mimeType: input.mimeType,
        organizationSlug: input.organizationSlug,
        originalFileName: input.originalFileName,
        projectSlug: input.projectSlug,
        recordId: input.recordId,
        userId: ctx.session.user.id,
      }),
    ),
  list: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        return []
      }

      return listRecordFiles({
        projectId: project.id,
        recordId: input.recordId,
      })
    }),
})
