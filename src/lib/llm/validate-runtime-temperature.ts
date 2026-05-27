import { TRPCError } from "@trpc/server"
import { runtimeTemperatureSchema } from "@/features/execution/schemas/runtime-temperature"

type ValidateRuntimeTemperatureParams = {
  temperature: number | null
}

export const validateRuntimeTemperature = ({
  temperature,
}: ValidateRuntimeTemperatureParams) => {
  if (temperature === null) {
    return null
  }

  const parsedTemperature = runtimeTemperatureSchema.safeParse(temperature)

  if (!parsedTemperature.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        parsedTemperature.error.issues[0]?.message ??
        "Runtime temperature is invalid.",
    })
  }

  return parsedTemperature.data
}
