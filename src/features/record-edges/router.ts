import { z } from "zod"
import { createRecordEdge } from "@/features/record-edges/lib/create-record-edge"
import { deactivateRecordEdge } from "@/features/record-edges/lib/deactivate-record-edge"
import { listRecordEdgeActivityForRecord } from "@/features/record-edges/lib/list-record-edge-activity-for-record"
import { listRecordEdgesForRecord } from "@/features/record-edges/lib/list-record-edges-for-record"
import { updateRecordEdge } from "@/features/record-edges/lib/update-record-edge"
import {
  relationCreateInputSchema,
  relationDeactivateInputSchema,
  relationUpdateInputSchema,
} from "@/features/record-edges/schemas/relation-input"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const recordEdgesRouter = router({
  create: protectedProcedure
    .input(projectScopeSchema.extend({ input: relationCreateInputSchema }))
    .mutation(({ ctx, input }) =>
      createRecordEdge({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  deactivate: protectedProcedure
    .input(projectScopeSchema.extend({ input: relationDeactivateInputSchema }))
    .mutation(({ ctx, input }) =>
      deactivateRecordEdge({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  listActivity: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      listRecordEdgeActivityForRecord({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        recordId: input.recordId,
        userId: ctx.session.user.id,
      }),
    ),
  listForRecord: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      listRecordEdgesForRecord({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        recordId: input.recordId,
        userId: ctx.session.user.id,
      }),
    ),
  update: protectedProcedure
    .input(projectScopeSchema.extend({ input: relationUpdateInputSchema }))
    .mutation(({ ctx, input }) =>
      updateRecordEdge({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
