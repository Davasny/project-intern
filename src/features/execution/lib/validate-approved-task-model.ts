import { TRPCError } from "@trpc/server"
import { runtimeModelSchema } from "@/features/execution/schemas/runtime-model"
import { backendConfig } from "@/lib/config/backend"

type ValidateApprovedTaskModelParams = {
  model: string | null
}

export const validateApprovedTaskModel = ({
  model,
}: ValidateApprovedTaskModelParams) => {
  if (model === null) {
    return null
  }

  const parsedModel = runtimeModelSchema.safeParse(model)

  if (!parsedModel.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: parsedModel.error.issues[0]?.message ?? "Task model is invalid.",
    })
  }

  if (!backendConfig.CRM_APPROVED_RUNTIME_MODELS.includes(parsedModel.data)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task model is not approved for runtime execution.",
    })
  }

  return parsedModel.data
}
