import { backendConfig } from "@/lib/config/backend"
import type { RuntimeModel } from "@/lib/llm/validate-approved-task-model"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"

type ResolveRuntimeModelParams = {
  taskModel: string | null
  projectDefaultModel?: string
}

export const resolveRuntimeModel = ({
  taskModel,
  projectDefaultModel,
}: ResolveRuntimeModelParams): RuntimeModel => {
  const fallback =
    projectDefaultModel ?? backendConfig.CRM_DEFAULT_RUNTIME_MODEL
  const runtimeModel = validateApprovedTaskModel({
    model: taskModel ?? fallback,
  })

  if (runtimeModel === null) {
    return backendConfig.CRM_DEFAULT_RUNTIME_MODEL
  }

  return runtimeModel
}
