import { and, eq, inArray, sql } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import {
  projectExportDataSchema,
} from "@/features/projects/schemas/project-export-data"
import type {
  ImportWarning,
  ProjectExportData,
  ProjectImportPreviewResult,
} from "@/features/projects/schemas/project-export-data"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type PreviewProjectImportParams = {
  fileContent: string
  organizationSlug: string
  projectSlug: string
  userId: string
}

const buildParseErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  return "Failed to parse import file."
}

const fetchExistingRecordNames = async (names: string[], projectId: string) => {
  if (names.length === 0) {
    return new Set<string>()
  }

  const existingRows = await db
    .select({ name: recordTable.name })
    .from(recordTable)
    .where(
      and(
        eq(recordTable.projectId, projectId),
        inArray(recordTable.name, names),
      ),
    )

  return new Set(existingRows.map((row) => row.name))
}

const fetchExistingTaskTitles = async (titles: string[], projectId: string) => {
  if (titles.length === 0) {
    return new Set<string>()
  }

  const existingRows = await db
    .select({ title: taskTable.title })
    .from(taskTable)
    .where(
      and(
        eq(taskTable.projectId, projectId),
        inArray(taskTable.title, titles),
      ),
    )

  return new Set(existingRows.map((row) => row.title))
}

const fetchExistingSchemaVersionNumbers = async (projectId: string) => {
  const existingRows = await db
    .select({ version: projectSchemaVersionTable.version })
    .from(projectSchemaVersionTable)
    .where(eq(projectSchemaVersionTable.projectId, projectId))

  return new Set(existingRows.map((row) => row.version))
}

const countProjectRecords = async (projectId: string) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recordTable)
    .where(eq(recordTable.projectId, projectId))

  return result?.count ?? 0
}

export const previewProjectImport = async ({
  fileContent,
  organizationSlug,
  projectSlug,
  userId,
}: PreviewProjectImportParams): Promise<ProjectImportPreviewResult> => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new Error("You do not have access to this project.")
  }

  let parsed: ProjectExportData

  try {
    const raw = JSON.parse(fileContent)
    parsed = projectExportDataSchema.parse(raw)
  } catch (error) {
    throw new Error(buildParseErrorMessage(error))
  }

  const data = parsed.data
  const warnings: ImportWarning[] = []

  let recordsFound = 0
  let tasksFound = 0
  let schemaVersionsFound = 0

  if (data.records && data.records.length > 0) {
    recordsFound = data.records.length
    const recordNames = data.records.map((record) => record.name)
    const existingNames = await fetchExistingRecordNames(recordNames, project.id)

    for (const name of recordNames) {
      if (existingNames.has(name)) {
        warnings.push({
          entityType: "record",
          message: `Record "${name}" already exists and will be skipped.`,
          name,
        })
      }
    }
  }

  if (data.tasks && data.tasks.length > 0) {
    tasksFound = data.tasks.length
    const taskTitles = data.tasks.map((task) => task.title)
    const existingTitles = await fetchExistingTaskTitles(taskTitles, project.id)

    for (const title of taskTitles) {
      if (existingTitles.has(title)) {
        warnings.push({
          entityType: "task",
          message: `Task "${title}" already exists and will be skipped.`,
          name: title,
        })
      }
    }
  }

  if (data.schemaVersions && data.schemaVersions.length > 0) {
    schemaVersionsFound = data.schemaVersions.length
    const existingVersionNumbers = await fetchExistingSchemaVersionNumbers(
      project.id,
    )
    const projectHasRecords = (await countProjectRecords(project.id)) > 0

    if (projectHasRecords) {
      warnings.push({
        entityType: "schema_version",
        message:
          "Target project has records. Schema versions cannot be imported via file import. Use the schema migration workflow instead.",
        name: "",
      })
    } else {
      for (const sv of data.schemaVersions) {
        if (existingVersionNumbers.has(sv.version)) {
          warnings.push({
            entityType: "schema_version",
            message: `Schema version ${sv.version} already exists and will be skipped.`,
            name: `v${sv.version}`,
          })
        }
      }
    }
  }

  return {
    data,
    summary: {
      hasProjectSettings: data.projectSettings !== undefined,
      recordsFound,
      schemaVersionsFound,
      tasksFound,
    },
    warnings,
  }
}
