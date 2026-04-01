import { TRPCError } from "@trpc/server"
import { applyProjectSchemaDefaults } from "@/features/project-schema/lib/apply-project-schema-defaults"
import { buildContextSchema } from "@/features/project-schema/lib/build-context-schema"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

type ValidateRecordContextParams = {
  context: Record<string, unknown>
  schemaDefinition: ProjectSchemaDefinition
}

export const validateRecordContext = ({
  context,
  schemaDefinition,
}: ValidateRecordContextParams) => {
  const nextContext = applyProjectSchemaDefaults(schemaDefinition, context)
  const contextSchema = buildContextSchema(schemaDefinition)
  const parsedContext = contextSchema.safeParse(nextContext)

  if (!parsedContext.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        parsedContext.error.issues[0]?.message ?? "Record context is invalid.",
    })
  }

  return parsedContext.data
}
