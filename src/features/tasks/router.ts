import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { acceptTaskDraftById } from "@/features/tasks/lib/accept-task-draft-by-id"
import { createTask } from "@/features/tasks/lib/create-task"
import { getTaskById } from "@/features/tasks/lib/get-task-by-id"
import { listTasks } from "@/features/tasks/lib/list-tasks"
import { rejectTaskDraftById } from "@/features/tasks/lib/reject-task-draft-by-id"
import { reorderTasks } from "@/features/tasks/lib/reorder-tasks"
import { resetDownstreamTaskRecords } from "@/features/tasks/lib/reset-downstream-task-records"
import { updateTask } from "@/features/tasks/lib/update-task"
import {
  taskCreateIntentSchema,
  taskInputSchema,
  taskReorderInputSchema,
  taskUpdateInputSchema,
} from "@/features/tasks/schemas/task-input"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const tasksRouter = router({
  create: protectedProcedure
    .input(
      projectScopeSchema.extend({
        input: taskInputSchema,
        intent: taskCreateIntentSchema,
        insertAfterTaskId: z.string().uuid().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createTask({
        insertAfterTaskId: input.insertAfterTaskId ?? null,
        intent: input.intent,
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  acceptDraft: protectedProcedure
    .input(projectScopeSchema.extend({ taskId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      acceptTaskDraftById({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        taskId: input.taskId,
        userId: ctx.session.user.id,
      }),
    ),
  getById: protectedProcedure
    .input(projectScopeSchema.extend({ taskId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      getTaskById({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        taskId: input.taskId,
        userId: ctx.session.user.id,
      }),
    ),
  list: protectedProcedure.input(projectScopeSchema).query(({ ctx, input }) =>
    listTasks({
      organizationSlug: input.organizationSlug,
      projectSlug: input.projectSlug,
      userId: ctx.session.user.id,
    }),
  ),
  reorder: protectedProcedure
    .input(projectScopeSchema.extend({ input: taskReorderInputSchema }))
    .mutation(({ ctx, input }) =>
      reorderTasks({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  rejectDraft: protectedProcedure
    .input(projectScopeSchema.extend({ taskId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      rejectTaskDraftById({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        taskId: input.taskId,
        userId: ctx.session.user.id,
      }),
    ),
  update: protectedProcedure
    .input(projectScopeSchema.extend({ input: taskUpdateInputSchema }))
    .mutation(({ ctx, input }) =>
      updateTask({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  resetDownstream: protectedProcedure
    .input(projectScopeSchema.extend({ taskId: z.string().uuid() }))
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

      return resetDownstreamTaskRecords({
        organizationId: project.organizationId,
        projectId: project.id,
        taskId: input.taskId,
      })
    }),
})
