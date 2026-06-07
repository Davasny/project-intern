import { and, eq, inArray } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import type {
  ImportWarning,
  ProjectExportData,
  ProjectImportPreviewResult,
} from "@/features/projects/schemas/project-export-data"
import { projectExportDataSchema } from "@/features/projects/schemas/project-export-data"
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
      and(eq(taskTable.projectId, projectId), inArray(taskTable.title, titles)),
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
  const recordConflicts: ProjectImportPreviewResult["recordConflicts"] = []

  let recordsFound = 0
  let tasksFound = 0
  let schemaVersionsFound = 0

  if (data.records && data.records.length > 0) {
    recordsFound = data.records.length
    const recordNames = data.records.map((record) => record.name)
    const existingNames = await fetchExistingRecordNames(
      recordNames,
      project.id,
    )

    const uniqueRecordNames = [...new Set(recordNames)]

    for (const name of uniqueRecordNames) {
      if (existingNames.has(name)) {
        recordConflicts.push({ name })
        warnings.push({
          entityType: "record",
          message: `Record "${name}" already exists. Choose whether to overwrite it or skip it.`,
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

    for (const sv of data.schemaVersions) {
      if (existingVersionNumbers.has(sv.version)) {
        warnings.push({
          entityType: "schema_version",
          message: `Schema version ${sv.version} already exists. Choose whether to overwrite it or import this schema as a new version.`,
          name: `v${sv.version}`,
        })
      }
    }
  }

  return {
    data,
    recordConflicts,
    summary: {
      hasProjectSettings: data.projectSettings !== undefined,
      recordsFound,
      schemaVersionsFound,
      tasksFound,
    },
    warnings,
  }
}
