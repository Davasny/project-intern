export const relationTypeValues = [
  "belongs_to",
  "related_to",
  "depends_on",
  "duplicates",
] as const

export type RelationType = (typeof relationTypeValues)[number]

type RelationTypeRule = {
  description: string
  label: string
  maxActiveOutboundEdges: number | null
}

export const relationTypeRules: Record<RelationType, RelationTypeRule> = {
  belongs_to: {
    description:
      "One source record points to a single owning or parent record.",
    label: "Belongs to",
    maxActiveOutboundEdges: 1,
  },
  depends_on: {
    description: "One source record depends on another record as an input.",
    label: "Depends on",
    maxActiveOutboundEdges: null,
  },
  duplicates: {
    description: "Two records describe the same real-world entity.",
    label: "Duplicates",
    maxActiveOutboundEdges: null,
  },
  related_to: {
    description:
      "Generic linked relationship without strict ownership semantics.",
    label: "Related to",
    maxActiveOutboundEdges: null,
  },
}
