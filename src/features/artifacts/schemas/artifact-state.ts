const artifactStates = [
  "registered",
  "available",
  "invalidated",
  "superseded",
] as const

export type ArtifactState = (typeof artifactStates)[number]
