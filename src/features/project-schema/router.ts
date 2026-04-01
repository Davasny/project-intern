import { TRPCError } from "@trpc/server"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { createProjectSchemaVersion } from "@/features/project-schema/lib/create-project-schema-version"
import { diffProjectSchemaVersions } from "@/features/project-schema/lib/diff-project-schema-versions"
import { getActiveProjectSchemaVersion } from "@/features/project-schema/lib/get-active-project-schema-version"
import { getProjectSchemaSettingsReadModel } from "@/features/project-schema/lib/get-project-schema-settings-read-model"
import { listProjectSchemaVersions } from "@/features/project-schema/lib/list-project-schema-versions"
import { projectSchemaCustomFieldSchema } from "@/features/project-schema/schemas/project-schema-field"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const projectSchemaRouter = router({
  createVersion: protectedProcedure
    .input(
      projectScopeSchema.extend({
        customFields: z.array(projectSchemaCustomFieldSchema),
      }),
    )
    .mutation(({ ctx, input }) =>
      createProjectSchemaVersion({
        customFields: input.customFields,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  diffVersions: protectedProcedure
    .input(
      projectScopeSchema.extend({
        nextVersionId: z.string().uuid(),
        previousVersionId: z.string().uuid(),
      }),
    )
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

      const versions = await db
        .select({
          id: projectSchemaVersionTable.id,
          schemaDefinition: projectSchemaVersionTable.schemaDefinition,
          version: projectSchemaVersionTable.version,
        })
        .from(projectSchemaVersionTable)
        .where(
          and(
            eq(projectSchemaVersionTable.projectId, project.id),
            inArray(projectSchemaVersionTable.id, [
              input.previousVersionId,
              input.nextVersionId,
            ]),
          ),
        )

      const previousVersion = versions.find(
        (version) => version.id === input.previousVersionId,
      )
      const nextVersion = versions.find(
        (version) => version.id === input.nextVersionId,
      )

      if (!previousVersion || !nextVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schema versions were not found.",
        })
      }

      return {
        diffs: diffProjectSchemaVersions(
          previousVersion.schemaDefinition,
          nextVersion.schemaDefinition,
        ),
        nextVersion,
        previousVersion,
      }
    }),
  getActive: protectedProcedure
    .input(projectScopeSchema)
    .query(({ ctx, input }) =>
      getActiveProjectSchemaVersion({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  getSettings: protectedProcedure
    .input(projectScopeSchema)
    .query(async ({ ctx, input }) => {
      const readModel = await getProjectSchemaSettingsReadModel({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!readModel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      return readModel
    }),
  listVersions: protectedProcedure
    .input(projectScopeSchema)
    .query(({ ctx, input }) =>
      listProjectSchemaVersions({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
