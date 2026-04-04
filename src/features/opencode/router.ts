import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { stopInteractiveServer } from "@/features/opencode/lib/get-opencode-client"
import { listDiskSkills } from "@/features/opencode/lib/list-disk-skills"
import {
  spawnDebugSession,
  stopDebugSession,
} from "@/features/opencode/lib/spawn-debug-session"
import {
  listSessionsOnExternalServer,
  spawnSession,
} from "@/features/opencode/lib/spawn-session"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { getProjectSkillsDirectory } from "@/lib/config/backend"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const opencodeRouter = router({
  listSkills: protectedProcedure
    .input(projectScopeSchema)
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

      const { skillsDirectory, skills } = await listDiskSkills(
        project.organizationId,
        project.id,
      )

      return {
        skillsDirectory,
        skills,
      }
    }),
  getSkillsRoot: protectedProcedure
    .input(projectScopeSchema)
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

      return {
        skillsDirectory: getProjectSkillsDirectory(
          project.organizationId,
          project.id,
        ),
      }
    }),
  spawnSession: protectedProcedure
    .input(
      projectScopeSchema.extend({
        title: z.string().trim().min(1).default("Interactive session"),
        taskId: z.string().uuid().optional(),
        recordId: z.string().uuid().optional(),
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

      if (input.taskId && input.recordId) {
        return spawnDebugSession({
          organizationId: project.organizationId,
          projectId: project.id,
          taskId: input.taskId,
          recordId: input.recordId,
          title: input.title,
        })
      }

      return spawnSession({
        organizationId: project.organizationId,
        projectId: project.id,
        title: input.title,
      })
    }),
  stopSession: protectedProcedure
    .input(
      z.object({
        serverId: z.string().uuid().optional(),
        agentRunId: z.string().uuid().optional(),
        taskRecordId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.agentRunId && input.taskRecordId) {
        await stopDebugSession({
          agentRunId: input.agentRunId,
          taskRecordId: input.taskRecordId,
        })
        return
      }

      if (input.serverId) {
        await stopInteractiveServer({
          serverId: input.serverId,
        })
        return
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Either serverId or (agentRunId and taskRecordId) must be provided.",
      })
    }),
  listSessions: protectedProcedure.input(projectScopeSchema).query(async () => {
    const sessions = await listSessionsOnExternalServer()

    return { sessions }
  }),
})
