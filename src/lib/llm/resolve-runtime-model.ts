import { backendConfig } from "@/lib/config/backend"
import type { RuntimeModel } from "@/lib/llm/validate-approved-task-model"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"

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
