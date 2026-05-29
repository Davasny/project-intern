import { TRPCError } from "@trpc/server"

export const parseRecordJsonTextareaValue = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value
  }

  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    return JSON.parse(trimmedValue)
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "JSON fields must contain valid JSON.",
    })
  }
}
