import { z } from "zod"

const hasOneDecimalPrecision = (value: number) => {
  const scaledValue = value * 10
  const roundedValue = Math.round(scaledValue)

  return Math.abs(scaledValue - roundedValue) < Number.EPSILON
}

export const runtimeTemperatureSchema = z
  .number()
  .min(0, "Temperature must be at least 0.0.")
  .max(1, "Temperature must be at most 1.0.")
  .refine(hasOneDecimalPrecision, {
    message: "Temperature must use 0.1 precision increments.",
  })
