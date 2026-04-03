import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { stopInteractiveServer } from "@/features/opencode/lib/get-opencode-client"
import { listDiskSkills } from "@/features/opencode/lib/list-disk-skills"
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

      return spawnSession({
        organizationId: project.organizationId,
        projectId: project.id,
        title: input.title,
      })
    }),
  stopSession: protectedProcedure
    .input(
      z.object({
        serverId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      await stopInteractiveServer({
        serverId: input.serverId,
      })
    }),
  listSessions: protectedProcedure
    .input(projectScopeSchema)
    .query(async ({ input }) => {
      const sessions = await listSessionsOnExternalServer()

      return { sessions }
    }),
})
