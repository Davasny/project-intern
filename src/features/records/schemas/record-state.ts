export const recordStateValues = [
  "active",
  "archived",
  "processing",
  "error",
] as const

export type RecordState = (typeof recordStateValues)[number]
