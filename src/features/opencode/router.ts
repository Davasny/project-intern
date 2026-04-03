import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { listDiskSkills } from "@/features/opencode/lib/list-disk-skills"
import {
  getServerUrl,
  spawnSession,
} from "@/features/opencode/lib/spawn-session"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { getProjectSkillsDirectory } from "@/lib/config/backend"
import { getOpencodeClient } from "@/lib/opencode/get-opencode-client"
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
        projectId: project.id,
        title: input.title,
      })
    }),
  listSessions: protectedProcedure
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

      const client = await getOpencodeClient()
      const sessionsResponse = await client.session.list()

      const serverUrl = getServerUrl()

      const sessions =
        sessionsResponse.data?.map((session) => ({
          id: session.id,
          title: session.title ?? "Untitled session",
          createdAt: session.time.created,
          directory: session.directory,
          cliCommand: `opencode attach ${serverUrl} --session ${session.id} --dir ${session.directory}`,
        })) ?? []

      return { sessions }
    }),
})
