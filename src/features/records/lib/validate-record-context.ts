import { TRPCError } from "@trpc/server"
import { applyProjectSchemaDefaults } from "@/features/project-schema/lib/apply-project-schema-defaults"
import { buildContextSchema } from "@/features/project-schema/lib/build-context-schema"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { logger } from "@/lib/logger"

import { z } from "zod"

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
    logger.debug({
      msg: "validateRecord error",
      parseError: z.prettifyError(parsedContext.error),
    })

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: z.prettifyError(parsedContext.error),
    })
  }

  return parsedContext.data
}
