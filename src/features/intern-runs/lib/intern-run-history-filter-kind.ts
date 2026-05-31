export type InternRunHistoryFilterKind =
  | "agent"
  | "metadata"
  | "reasoning"
  | "system"
  | "tool"

export const internRunHistoryDefaultFilterKinds: ReadonlyArray<InternRunHistoryFilterKind> =
  ["tool", "reasoning", "agent", "system"]

export const internRunHistoryFilterKinds: ReadonlyArray<InternRunHistoryFilterKind> =
  [...internRunHistoryDefaultFilterKinds, "metadata"]

export const internRunHistoryFilterKindLabels: Record<
  InternRunHistoryFilterKind,
  string
> = {
  agent: "Agent",
  metadata: "Metadata",
  reasoning: "Reasoning",
  system: "System",
  tool: "Tool",
}
