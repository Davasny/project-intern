import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { activateRecord } from "@/features/records/lib/activate-record"
import { commitRecordImport } from "@/features/records/lib/commit-record-import"
import { createRecord } from "@/features/records/lib/create-record"
import { deactivateRecord } from "@/features/records/lib/deactivate-record"
import { deleteRecord } from "@/features/records/lib/delete-record"
import { getRecordById } from "@/features/records/lib/get-record-by-id"
import { listRecords } from "@/features/records/lib/list-records"
import { previewRecordImport } from "@/features/records/lib/preview-record-import"
import { updateRecord } from "@/features/records/lib/update-record"
import {
  recordImportCommitInputSchema,
  recordImportPreviewInputSchema,
} from "@/features/records/schemas/record-import"
import {
  recordInputSchema,
  recordUpdateInputSchema,
} from "@/features/records/schemas/record-input"
import { resetDownstreamTaskRecordsForRecord } from "@/features/task-records/lib/reset-downstream-task-records-for-record"
import { retryTaskRecordForRecord } from "@/features/task-records/lib/retry-task-record-for-record"
import { triggerTaskRecordForRecord } from "@/features/task-records/lib/trigger-task-record-for-record"
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
  importPreview: protectedProcedure
    .input(projectScopeSchema.extend({ input: recordImportPreviewInputSchema }))
    .mutation(({ ctx, input }) =>
      previewRecordImport({
        csvContent: input.input.csvContent,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  importCommit: protectedProcedure
    .input(projectScopeSchema.extend({ input: recordImportCommitInputSchema }))
    .mutation(({ ctx, input }) =>
      commitRecordImport({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
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
  retryTaskRecord: protectedProcedure
    .input(
      projectScopeSchema.extend({
        recordId: z.string().uuid(),
        taskRecordId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      return retryTaskRecordForRecord({
        actorId: ctx.session.user.id,
        organizationId: project.organizationId,
        projectId: project.id,
        recordId: input.recordId,
        taskRecordId: input.taskRecordId,
      })
    }),
  resetDownstreamTaskRecord: protectedProcedure
    .input(
      projectScopeSchema.extend({
        recordId: z.string().uuid(),
        taskRecordId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      return resetDownstreamTaskRecordsForRecord({
        actorId: ctx.session.user.id,
        organizationId: project.organizationId,
        projectId: project.id,
        recordId: input.recordId,
        taskRecordId: input.taskRecordId,
      })
    }),
  triggerTaskRecord: protectedProcedure
    .input(
      projectScopeSchema.extend({
        recordId: z.string().uuid(),
        taskRecordId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      return triggerTaskRecordForRecord({
        actorId: ctx.session.user.id,
        organizationId: project.organizationId,
        projectId: project.id,
        recordId: input.recordId,
        taskRecordId: input.taskRecordId,
      })
    }),
  remove: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) =>
      deleteRecord({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        recordId: input.recordId,
        userId: ctx.session.user.id,
      }),
    ),
  activate: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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

      return activateRecord({
        projectId: project.id,
        recordId: input.recordId,
      })
    }),
  deactivate: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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

      return deactivateRecord({
        projectId: project.id,
        recordId: input.recordId,
      })
    }),
})
