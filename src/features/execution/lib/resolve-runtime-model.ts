import { validateApprovedTaskModel } from "@/features/execution/lib/validate-approved-task-model"
import type { RuntimeModel } from "@/features/execution/schemas/runtime-model"
import { backendConfig } from "@/lib/config/backend"

type ResolveRuntimeModelParams = {
  taskModel: string | null
}

export const resolveRuntimeModel = ({
  taskModel,
}: ResolveRuntimeModelParams): RuntimeModel => {
  const runtimeModel = validateApprovedTaskModel({
    model: taskModel ?? backendConfig.CRM_DEFAULT_RUNTIME_MODEL,
  })

  if (runtimeModel === null) {
    return backendConfig.CRM_DEFAULT_RUNTIME_MODEL
  }

  return runtimeModel
}
