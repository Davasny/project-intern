import { z } from "zod"
import { commitProjectImport } from "@/features/projects/lib/commit-project-import"
import { createProject } from "@/features/projects/lib/create-project"
import { exportProjectData } from "@/features/projects/lib/export-project-data"
import { getProjectSettings } from "@/features/projects/lib/get-project-settings"
import { listOrganizationProjects } from "@/features/projects/lib/list-organization-projects"
import { previewProjectImport } from "@/features/projects/lib/preview-project-import"
import { updateProjectSettings } from "@/features/projects/lib/update-project-settings"
import {
  projectExportRequestSchema,
  projectImportCommitInputSchema,
} from "@/features/projects/schemas/project-export-data"
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
          internPythonRequirements: z.string(),
          defaultModel: z.string().trim().min(1),
          defaultTemperature: z.number(),
          isAutopickEnabled: z.boolean(),
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
  exportData: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().trim().min(1),
        projectSlug: z.string().trim().min(1),
        exportOptions: projectExportRequestSchema,
      }),
    )
    .query(({ ctx, input }) =>
      exportProjectData({
        exportOptions: input.exportOptions,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  importPreview: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().trim().min(1),
        projectSlug: z.string().trim().min(1),
        fileContent: z.string().trim().min(1, "File content is required."),
      }),
    )
    .mutation(({ ctx, input }) =>
      previewProjectImport({
        fileContent: input.fileContent,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  importCommit: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().trim().min(1),
        projectSlug: z.string().trim().min(1),
        input: projectImportCommitInputSchema,
      }),
    )
    .mutation(({ ctx, input }) =>
      commitProjectImport({
        input: input.input,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
