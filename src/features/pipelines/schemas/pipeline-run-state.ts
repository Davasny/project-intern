export const pipelineRunStates = [
  "registered",
  "running",
  "completed",
  "failed",
] as const

export type PipelineRunState = (typeof pipelineRunStates)[number]
