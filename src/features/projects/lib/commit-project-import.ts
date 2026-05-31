import { TRPCError } from "@trpc/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { writeInternRequirements } from "@/features/projects/lib/write-intern-requirements"
import type { ProjectImportCommitInput } from "@/features/projects/schemas/project-export-data"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type CommitProjectImportParams = {
  input: ProjectImportCommitInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

type ImportCounts = {
  tasksImported: number
  recordsImported: number
  schemaVersionsImported: number
  projectSettingsImported: boolean
}

export const commitProjectImport = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: CommitProjectImportParams): Promise<ImportCounts> => {
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

  const data = input.data

  try {
    const result = await db.transaction(async (transaction) => {
      let existingRecordNames = new Set<string>()

      if (data.records && data.records.length > 0) {
        const recordNames = data.records.map((r) => r.name)
        const rows = await transaction
          .select({ name: recordTable.name })
          .from(recordTable)
          .where(
            and(
              eq(recordTable.projectId, project.id),
              inArray(recordTable.name, recordNames),
            ),
          )

        existingRecordNames = new Set(rows.map((row) => row.name))
      }

      let existingTaskTitles = new Set<string>()

      if (data.tasks && data.tasks.length > 0) {
        const taskTitles = data.tasks.map((t) => t.title)
        const rows = await transaction
          .select({ title: taskTable.title })
          .from(taskTable)
          .where(
            and(
              eq(taskTable.projectId, project.id),
              inArray(taskTable.title, taskTitles),
            ),
          )

        existingTaskTitles = new Set(rows.map((row) => row.title))
      }

      let existingSchemaVersionNumbers = new Set<number>()

      if (data.schemaVersions && data.schemaVersions.length > 0) {
        const svRows = await transaction
          .select({ version: projectSchemaVersionTable.version })
          .from(projectSchemaVersionTable)
          .where(eq(projectSchemaVersionTable.projectId, project.id))

        existingSchemaVersionNumbers = new Set(svRows.map((row) => row.version))
      }

      const schemaVersionIdMap = new Map<string, string>()
      let schemaVersionsImported = 0
      let maxSchemaVersion = 0

      if (data.schemaVersions && data.schemaVersions.length > 0) {
        const toInsert = data.schemaVersions.filter(
          (sv) => !existingSchemaVersionNumbers.has(sv.version),
        )
        const sorted = [...toInsert].sort((a, b) => a.version - b.version)

        for (const sv of sorted) {
          const remappedParentId =
            sv.parentVersionId !== null
              ? (schemaVersionIdMap.get(sv.parentVersionId) ?? null)
              : null

          const [inserted] = await transaction
            .insert(projectSchemaVersionTable)
            .values({
              parentVersionId: sql`${remappedParentId}::uuid`,
              projectId: project.id,
              proposedBy: null,
              schemaDefinition: sql`${JSON.stringify(sv.schemaDefinition)}::jsonb`,
              state: sql`${sv.state}`,
              version: sv.version,
            })
            .returning({ id: projectSchemaVersionTable.id })

          if (inserted) {
            schemaVersionIdMap.set(sv.id, inserted.id)
            schemaVersionsImported++

            if (sv.version > maxSchemaVersion) {
              maxSchemaVersion = sv.version
            }
          }
        }
      }

      let recordsImported = 0

      if (data.records && data.records.length > 0) {
        for (const record of data.records) {
          if (existingRecordNames.has(record.name)) {
            continue
          }

          const [result] = await transaction
            .insert(recordTable)
            .values({
              context: record.context,
              name: record.name,
              projectId: project.id,
              schemaVersion: record.schemaVersion,
              state: "inactive",
            })
            .returning({ id: recordTable.id })

          if (result) {
            recordsImported++
          }
        }
      }

      let tasksImported = 0

      if (data.tasks && data.tasks.length > 0) {
        const [maxRow] = await transaction
          .select({
            maxSortOrder: sql<number>`coalesce(max(${taskTable.sortOrder}), 0)`,
          })
          .from(taskTable)
          .where(eq(taskTable.projectId, project.id))

        const maxSortOrder = maxRow?.maxSortOrder ?? 0

        for (const task of data.tasks) {
          if (existingTaskTitles.has(task.title)) {
            continue
          }

          const remappedSourceId =
            task.sourceSchemaVersionId !== null
              ? (schemaVersionIdMap.get(task.sourceSchemaVersionId) ?? null)
              : null

          const remappedTargetId =
            task.targetSchemaVersionId !== null
              ? (schemaVersionIdMap.get(task.targetSchemaVersionId) ?? null)
              : null

          tasksImported++

          await transaction.insert(taskTable).values({
            acceptedBy: null,
            descriptionMarkdown: task.descriptionMarkdown,
            idempotencyKey: crypto.randomUUID(),
            model: task.model,
            projectId: project.id,
            proposedBy: null,
            rejectedBy: null,
            schemaVersion: task.schemaVersion,
            sortOrder: maxSortOrder + tasksImported,
            sourceSchemaVersionId: sql`${remappedSourceId}::uuid`,
            state: sql`${task.state}`,
            targetSchemaVersionId: sql`${remappedTargetId}::uuid`,
            temperature: task.temperature,
            title: task.title,
          })
        }
      }

      if (maxSchemaVersion > 0) {
        const [activeVersion] = await transaction
          .select({ id: projectSchemaVersionTable.id })
          .from(projectSchemaVersionTable)
          .where(
            and(
              eq(projectSchemaVersionTable.projectId, project.id),
              eq(projectSchemaVersionTable.version, maxSchemaVersion),
            ),
          )

        if (activeVersion) {
          await transaction
            .update(projectTable)
            .set({ activeSchemaVersionId: activeVersion.id })
            .where(eq(projectTable.id, project.id))
        }
      }

      if (data.projectSettings) {
        await transaction
          .update(projectTable)
          .set({
            internPythonRequirements:
              data.projectSettings.internPythonRequirements,
            defaultModel: data.projectSettings.defaultModel,
            defaultTemperature: data.projectSettings.defaultTemperature,
            isAutopickEnabled: data.projectSettings.isAutopickEnabled,
          })
          .where(eq(projectTable.id, project.id))
      }

      return {
        projectSettingsImported: data.projectSettings !== undefined,
        recordsImported,
        schemaVersionsImported,
        tasksImported,
      }
    })

    if (data.projectSettings) {
      await writeInternRequirements({
        projectId: project.id,
        requirements: data.projectSettings.internPythonRequirements,
      })
    }

    logger.info(
      {
        organizationSlug,
        projectId: project.id,
        projectSlug,
        ...result,
        userId,
      },
      "Project import completed",
    )

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed."

    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    })
  }
}
