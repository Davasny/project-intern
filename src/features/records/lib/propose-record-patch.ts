import { TRPCError } from "@trpc/server"
import { patchProposalSchema } from "@/features/execution/schemas/patch-proposal"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"

type ProposeRecordPatchParams = {
  patch: unknown
  projectId: string
  recordId: string
}

export const proposeRecordPatch = async ({
  patch,
  projectId,
  recordId,
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

  const activeSchemaVersion = await getActiveProjectSchemaVersionByProjectId({
    projectId,
  })

  const allowedFields = new Set(
    activeSchemaVersion.schemaDefinition.fields.map((field) => field.key),
  )

  for (const change of parsedPatch.data.changes) {
    if (change.field === "id") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Record id cannot be changed.",
      })
    }

    if (change.field !== "name" && !allowedFields.has(change.field)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Field ${change.field} does not exist in the active schema.`,
      })
    }
  }

  return parsedPatch.data
}
