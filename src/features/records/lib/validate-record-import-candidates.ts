import { and, eq, inArray } from "drizzle-orm"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { recordTable } from "@/features/records/db"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import type { RecordImportError } from "@/features/records/schemas/record-import"
import { db } from "@/lib/db"

type CandidateInput = {
  context: Record<string, unknown>
  name: string
  rowNumber: number
}

type ValidateRecordImportCandidatesParams = {
  projectId: string
  schemaDefinition: ProjectSchemaDefinition
  sourceRecords: CandidateInput[]
}

type ValidateRecordImportCandidatesResult = {
  errors: RecordImportError[]
  validRecords: CandidateInput[]
}

const normalizeImportName = (name: string) => name.trim()

const extractNamesWithDuplicates = (records: CandidateInput[]) => {
  const nameToRows = new Map<string, number[]>()

  for (const record of records) {
    const normalizedName = normalizeImportName(record.name)
    const currentRows = nameToRows.get(normalizedName) ?? []
    nameToRows.set(normalizedName, [...currentRows, record.rowNumber])
  }

  return Array.from(nameToRows.entries())
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([name]) => name)
}

const parseConflictingDbNames = async ({
  names,
  projectId,
}: {
  names: string[]
  projectId: string
}) => {
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

export const validateRecordImportCandidates = async ({
  projectId,
  schemaDefinition,
  sourceRecords,
}: ValidateRecordImportCandidatesParams): Promise<ValidateRecordImportCandidatesResult> => {
  const errors: RecordImportError[] = []
  const parsedCandidates: CandidateInput[] = []

  for (const sourceRecord of sourceRecords) {
    const normalizedName = normalizeImportName(sourceRecord.name)

    if (!normalizedName) {
      errors.push({
        field: "name",
        message: "Record name is required.",
        rowNumber: sourceRecord.rowNumber,
      })
      continue
    }

    try {
      const validatedContext = validateRecordContext({
        context: sourceRecord.context,
        schemaDefinition,
      })

      parsedCandidates.push({
        context: validatedContext,
        name: normalizedName,
        rowNumber: sourceRecord.rowNumber,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid record context."

      errors.push({
        field: "context",
        message,
        rowNumber: sourceRecord.rowNumber,
      })
    }
  }

  const duplicatedNamesInPayload = extractNamesWithDuplicates(parsedCandidates)

  if (duplicatedNamesInPayload.length > 0) {
    for (const candidate of parsedCandidates) {
      if (!duplicatedNamesInPayload.includes(candidate.name)) {
        continue
      }

      errors.push({
        field: "name",
        message: `Record name "${candidate.name}" appears multiple times in this import file.`,
        rowNumber: candidate.rowNumber,
      })
    }
  }

  const conflictingDbNames = await parseConflictingDbNames({
    names: Array.from(
      new Set(parsedCandidates.map((candidate) => candidate.name)),
    ),
    projectId,
  })

  if (conflictingDbNames.size > 0) {
    for (const candidate of parsedCandidates) {
      if (!conflictingDbNames.has(candidate.name)) {
        continue
      }

      errors.push({
        field: "name",
        message: `Record name "${candidate.name}" already exists in this project.`,
        rowNumber: candidate.rowNumber,
      })
    }
  }

  const invalidRows = new Set(
    errors
      .map((error) => error.rowNumber)
      .filter((rowNumber): rowNumber is number => rowNumber !== null),
  )

  const validRecords = parsedCandidates.filter(
    (candidate) => !invalidRows.has(candidate.rowNumber),
  )

  return {
    errors,
    validRecords,
  }
}
