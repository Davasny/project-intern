import { z } from "zod"

const recordStateValues = [
  "active",
  "archived",
  "inactive",
  "processing",
  "error",
] as const

export type RecordState = (typeof recordStateValues)[number]

export const recordStateSchema = z.enum(recordStateValues)
