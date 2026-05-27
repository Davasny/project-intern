import { z } from "zod"
import { createProject } from "@/features/projects/lib/create-project"
import { getProjectOverview } from "@/features/projects/lib/get-project-overview"
import { getProjectSettings } from "@/features/projects/lib/get-project-settings"
import { listOrganizationProjects } from "@/features/projects/lib/list-organization-projects"
import { updateProjectSettings } from "@/features/projects/lib/update-project-settings"
import { protectedProcedure, router } from "@/lib/trpc/init"

const organizationSlugSchema = z.object({
  organizationSlug: z.string().trim().min(1),
})

export const projectsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(2),
        organizationSlug: z.string().trim().min(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      createProject({
        displayName: input.displayName,
        organizationSlug: input.organizationSlug,
        userId: ctx.session.user.id,
      }),
    ),
  listForOrganization: protectedProcedure
    .input(organizationSlugSchema)
    .query(({ ctx, input }) =>
      listOrganizationProjects({
        organizationSlug: input.organizationSlug,
        userId: ctx.session.user.id,
      }),
    ),
  overview: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().trim().min(1),
        projectSlug: z.string().trim().min(1),
      }),
    )
    .query(({ ctx, input }) =>
      getProjectOverview({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  getSettings: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().trim().min(1),
        projectSlug: z.string().trim().min(1),
      }),
    )
    .query(({ ctx, input }) =>
      getProjectSettings({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  updateSettings: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().trim().min(1),
        projectSlug: z.string().trim().min(1),
        input: z.object({
          defaultModel: z.string().trim().min(1),
          defaultTemperature: z.number(),
        }),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateProjectSettings({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
