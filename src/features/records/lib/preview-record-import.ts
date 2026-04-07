import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { parseCsvContent } from "@/features/records/lib/parse-csv-content"
import { parseRecordImportContextFromCsvRow } from "@/features/records/lib/parse-record-import-context-from-csv-row"
import { validateRecordImportCandidates } from "@/features/records/lib/validate-record-import-candidates"
import type { RecordImportPreviewResult } from "@/features/records/schemas/record-import"

type PreviewRecordImportParams = {
  csvContent: string
  organizationSlug: string
  projectSlug: string
  userId: string
}

const buildCsvRowObject = ({
  headers,
  row,
}: {
  headers: string[]
  row: string[]
}) => {
  const rowObject: Record<string, string> = {}

  headers.forEach((header, index) => {
    rowObject[header] = row[index] ?? ""
  })

  return rowObject
}

const getNonSystemSchemaKeys = (schemaDefinition: ProjectSchemaDefinition) =>
  schemaDefinition.fields
    .filter((field) => !field.isSystem)
    .map((field) => field.key)

const createPreviewErrorResult = (
  message: string,
): RecordImportPreviewResult => ({
  errors: [
    {
      field: null,
      message,
      rowNumber: null,
    },
  ],
  proposedRecords: [],
  summary: {
    errorCount: 1,
    proposedCount: 0,
    totalRows: 0,
  },
})

export const previewRecordImport = async ({
  csvContent,
  organizationSlug,
  projectSlug,
  userId,
}: PreviewRecordImportParams): Promise<RecordImportPreviewResult> => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    return createPreviewErrorResult("You do not have access to this project.")
  }

  const initialSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId: project.id,
    version: 1,
  })

  let headers: string[]
  let rows: string[][]

  try {
    const parsedCsvContent = parseCsvContent(csvContent)
    headers = parsedCsvContent.headers
    rows = parsedCsvContent.rows
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse CSV content."

    return createPreviewErrorResult(message)
  }

  if (rows.length === 0) {
    return createPreviewErrorResult("CSV does not include any data rows.")
  }

  const nameHeaderExists = headers.includes("name")

  if (!nameHeaderExists) {
    return createPreviewErrorResult(
      'CSV must include a "name" column in the header row.',
    )
  }

  const nonSystemFieldKeys = getNonSystemSchemaKeys(
    initialSchemaVersion.schemaDefinition,
  )
  const allowedHeaders = new Set(["name", ...nonSystemFieldKeys])
  const unsupportedHeaders = headers.filter(
    (header) => !allowedHeaders.has(header),
  )

  if (unsupportedHeaders.length > 0) {
    return createPreviewErrorResult(
      `CSV contains unsupported columns: ${unsupportedHeaders.join(", ")}.`,
    )
  }

  const sourceRecords: Array<{
    context: Record<string, unknown>
    name: string
    rowNumber: number
  }> = []
  const parseErrors: RecordImportPreviewResult["errors"] = []

  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2
    const rowObject = buildCsvRowObject({ headers, row })
    const name = (rowObject.name ?? "").trim()

    const isCompletelyBlank = Object.values(rowObject).every(
      (value) => value.trim().length === 0,
    )

    if (isCompletelyBlank) {
      return
    }

    try {
      const context = parseRecordImportContextFromCsvRow({
        csvRow: rowObject,
        rowNumber,
        schemaDefinition: initialSchemaVersion.schemaDefinition,
      })

      sourceRecords.push({
        context,
        name,
        rowNumber,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse CSV row."

      parseErrors.push({
        field: "context",
        message,
        rowNumber,
      })
    }
  })

  if (sourceRecords.length === 0) {
    return {
      errors: [
        ...parseErrors,
        {
          field: null,
          message: "CSV does not include any importable rows.",
          rowNumber: null,
        },
      ],
      proposedRecords: [],
      summary: {
        errorCount: parseErrors.length + 1,
        proposedCount: 0,
        totalRows: rows.length,
      },
    }
  }

  const validationResult = await validateRecordImportCandidates({
    projectId: project.id,
    schemaDefinition: initialSchemaVersion.schemaDefinition,
    sourceRecords,
  })

  const errors = [...parseErrors, ...validationResult.errors]

  return {
    errors,
    proposedRecords: validationResult.validRecords,
    summary: {
      errorCount: errors.length,
      proposedCount: validationResult.validRecords.length,
      totalRows: rows.length,
    },
  }
}
