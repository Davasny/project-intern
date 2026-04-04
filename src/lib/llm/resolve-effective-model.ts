import { backendConfig } from "@/lib/config/backend"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"

type ResolveEffectiveModelParams = {
  taskModel: string | null
  projectDefaultModel: string
}

export const resolveEffectiveModel = ({
  taskModel,
  projectDefaultModel,
}: ResolveEffectiveModelParams): string => {
  const model = taskModel ?? projectDefaultModel
  const runtimeModel = validateApprovedTaskModel({ model })
  if (runtimeModel === null) {
    return backendConfig.CRM_DEFAULT_RUNTIME_MODEL
  }
  return runtimeModel
}
