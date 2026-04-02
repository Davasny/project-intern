import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import type { PatchProposal } from "@/features/execution/schemas/patch-proposal"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { recordTable } from "@/features/records/db"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { validateRecordContext } from "@/features/records/lib/validate-record-context"
import { db } from "@/lib/db"

type ApplyRecordPatchParams = {
  patch: PatchProposal
  projectId: string
  recordId: string
  schemaVersion: number
}

export const applyRecordPatch = async ({
  patch,
  projectId,
  recordId,
  schemaVersion,
}: ApplyRecordPatchParams) => {
  const record = await getScopedRecord({ projectId, recordId })

  if (patch.recordId !== record.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Patch proposal must target the scoped record.",
    })
  }

  if (patch.baseVersion !== record.version) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Record patch conflict. Refresh and try again.",
    })
  }

  let nextName = record.name
  const nextContext = { ...record.context }

  for (const change of patch.changes) {
    if (change.field === "id") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Record id cannot be changed.",
      })
    }

    if (change.field === "name") {
      if (change.op === "unset") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Record name cannot be unset.",
        })
      }

      if (
        typeof change.value !== "string" ||
        change.value.trim().length === 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Record name must be a non-empty string.",
        })
      }

      nextName = change.value.trim()
      continue
    }

    if (change.op === "unset") {
      delete nextContext[change.field]
      continue
    }

    nextContext[change.field] = change.value
  }

  const patchSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId,
    version: schemaVersion,
  })
  const validatedContext = validateRecordContext({
    context: nextContext,
    schemaDefinition: patchSchemaVersion.schemaDefinition,
  })

  const [updatedRecord] = await db
    .update(recordTable)
    .set({
      context: validatedContext,
      name: nextName,
      schemaVersion,
      version: record.version + 1,
    })
    .where(
      and(
        eq(recordTable.id, record.id),
        eq(recordTable.version, record.version),
      ),
    )
    .returning({
      context: recordTable.context,
      createdAt: recordTable.createdAt,
      id: recordTable.id,
      name: recordTable.name,
      projectId: recordTable.projectId,
      schemaVersion: recordTable.schemaVersion,
      state: recordTable.state,
      updatedAt: recordTable.updatedAt,
      version: recordTable.version,
    })

  if (!updatedRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Record patch conflict. Refresh and try again.",
    })
  }

  return updatedRecord
}
