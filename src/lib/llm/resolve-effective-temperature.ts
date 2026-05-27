import { validateRuntimeTemperature } from "@/lib/llm/validate-runtime-temperature"

type ResolveEffectiveTemperatureParams = {
  projectDefaultTemperature: number
  taskTemperature: number | null
}

export const resolveEffectiveTemperature = ({
  projectDefaultTemperature,
  taskTemperature,
}: ResolveEffectiveTemperatureParams) => {
  const runtimeTemperature = validateRuntimeTemperature({
    temperature: taskTemperature ?? projectDefaultTemperature,
  })

  if (runtimeTemperature === null) {
    return 0.5
  }

  return runtimeTemperature
}
