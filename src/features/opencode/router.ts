import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { listDiskSkills } from "@/features/opencode/lib/list-disk-skills"
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
})
