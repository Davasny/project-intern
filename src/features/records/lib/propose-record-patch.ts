import { TRPCError } from "@trpc/server"
import { patchProposalSchema } from "@/features/execution/schemas/patch-proposal"
import { getProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-project-schema-version-by-project-id"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"

type ProposeRecordPatchParams = {
  patch: unknown
  projectId: string
  recordId: string
  schemaVersion: number
}

export const proposeRecordPatch = async ({
  patch,
  projectId,
  recordId,
  schemaVersion,
}: ProposeRecordPatchParams) => {
  const parsedPatch = patchProposalSchema.safeParse(patch)

  if (!parsedPatch.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        parsedPatch.error.issues[0]?.message ?? "Patch proposal is invalid.",
    })
  }

  const record = await getScopedRecord({ projectId, recordId })

  if (parsedPatch.data.recordId !== record.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Patch proposal must target the scoped record.",
    })
  }

  const patchSchemaVersion = await getProjectSchemaVersionByProjectId({
    projectId,
    version: schemaVersion,
  })

  const allowedFields = new Set(
    patchSchemaVersion.schemaDefinition.fields.map((field) => field.key),
  )

  for (const change of parsedPatch.data.changes) {
    if (change.field === "id") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Record id cannot be changed.",
      })
    }

    if (change.field === "schemaVersion") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "schemaVersion is not patchable. Complete the task with patch null when only schema adoption is needed.",
      })
    }

    if (change.field !== "name" && !allowedFields.has(change.field)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Field ${change.field} does not exist in schema v${schemaVersion}.`,
      })
    }
  }

  return parsedPatch.data
}
