import { validateRuntimeTemperature } from "@/lib/llm/validate-runtime-temperature"

type ResolveRuntimeTemperatureParams = {
  projectDefaultTemperature?: number
  taskTemperature: number | null
}

export const resolveRuntimeTemperature = ({
  projectDefaultTemperature,
  taskTemperature,
}: ResolveRuntimeTemperatureParams) => {
  const runtimeTemperature = validateRuntimeTemperature({
    temperature: taskTemperature ?? projectDefaultTemperature ?? 0.5,
  })

  if (runtimeTemperature === null) {
    return 0.5
  }

  return runtimeTemperature
}
