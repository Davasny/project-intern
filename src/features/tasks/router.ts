import { z } from "zod"
import { createTask } from "@/features/tasks/lib/create-task"
import { getTaskById } from "@/features/tasks/lib/get-task-by-id"
import { listTasks } from "@/features/tasks/lib/list-tasks"
import { reorderTasks } from "@/features/tasks/lib/reorder-tasks"
import { updateTask } from "@/features/tasks/lib/update-task"
import {
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
    .input(projectScopeSchema.extend({ input: taskInputSchema }))
    .mutation(({ ctx, input }) =>
      createTask({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
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
})
