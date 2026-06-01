import { TRPCError } from "@trpc/server"
import { asc, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import type { ProjectExportRequest } from "@/features/projects/schemas/project-export-data"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type ExportProjectDataParams = {
  exportOptions: ProjectExportRequest
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const exportProjectData = async ({
  exportOptions,
  organizationSlug,
  projectSlug,
  userId,
}: ExportProjectDataParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const data: Record<string, unknown> = {}

  if (exportOptions.exportTasks) {
    const tasks = await db
      .select({
        id: taskTable.id,
        title: taskTable.title,
        descriptionMarkdown: taskTable.descriptionMarkdown,
        model: taskTable.model,
        temperature: taskTable.temperature,
        sortOrder: taskTable.sortOrder,
        state: taskTable.state,
        schemaVersion: taskTable.schemaVersion,
        sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
        targetSchemaVersionId: taskTable.targetSchemaVersionId,
      })
      .from(taskTable)
      .where(eq(taskTable.projectId, project.id))
      .orderBy(asc(taskTable.sortOrder))

    data.tasks = tasks
  }

  if (exportOptions.exportRecords) {
    const records = await db
      .select({
        id: recordTable.id,
        name: recordTable.name,
        context: recordTable.context,
        schemaVersion: recordTable.schemaVersion,
      })
      .from(recordTable)
      .where(eq(recordTable.projectId, project.id))

    data.records = records
  }

  if (exportOptions.exportSchemaVersions) {
    const schemaVersions = await db
      .select({
        id: projectSchemaVersionTable.id,
        version: projectSchemaVersionTable.version,
        state: projectSchemaVersionTable.state,
        schemaDefinition: projectSchemaVersionTable.schemaDefinition,
        parentVersionId: projectSchemaVersionTable.parentVersionId,
      })
      .from(projectSchemaVersionTable)
      .where(eq(projectSchemaVersionTable.projectId, project.id))

    data.schemaVersions = schemaVersions
  }

  if (exportOptions.exportProjectSettings) {
    const [settings] = await db
      .select({
        descriptionMarkdown: projectTable.descriptionMarkdown,
        internPythonRequirements: projectTable.internPythonRequirements,
        defaultModel: projectTable.defaultModel,
        defaultTemperature: projectTable.defaultTemperature,
        isAutopickEnabled: projectTable.isAutopickEnabled,
      })
      .from(projectTable)
      .where(eq(projectTable.id, project.id))

    data.projectSettings = settings ?? undefined
  }

  return {
    formatVersion: 1 as const,
    exportedAt: new Date().toISOString(),
    source: {
      organizationSlug,
      projectSlug,
    },
    data,
  }
}
