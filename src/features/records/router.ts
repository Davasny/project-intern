import { z } from "zod"
import { createRecord } from "@/features/records/lib/create-record"
import { getRecordById } from "@/features/records/lib/get-record-by-id"
import { listRecords } from "@/features/records/lib/list-records"
import { updateRecord } from "@/features/records/lib/update-record"
import {
  recordInputSchema,
  recordUpdateInputSchema,
} from "@/features/records/schemas/record-input"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const recordsRouter = router({
  create: protectedProcedure
    .input(projectScopeSchema.extend({ input: recordInputSchema }))
    .mutation(({ ctx, input }) =>
      createRecord({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  getById: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      getRecordById({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        recordId: input.recordId,
        userId: ctx.session.user.id,
      }),
    ),
  list: protectedProcedure.input(projectScopeSchema).query(({ ctx, input }) =>
    listRecords({
      organizationSlug: input.organizationSlug,
      projectSlug: input.projectSlug,
      userId: ctx.session.user.id,
    }),
  ),
  update: protectedProcedure
    .input(projectScopeSchema.extend({ input: recordUpdateInputSchema }))
    .mutation(({ ctx, input }) =>
      updateRecord({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
