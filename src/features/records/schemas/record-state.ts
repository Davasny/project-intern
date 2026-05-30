const recordStateValues = [
  "active",
  "archived",
  "inactive",
  "processing",
  "error",
] as const

export type RecordState = (typeof recordStateValues)[number]
