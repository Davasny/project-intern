import { atomWithHash } from "jotai-location"

export const hideAgentRunHistoryMetadataAtom = atomWithHash<boolean>(
  "hideMetadata",
  true,
  {
    deserialize: (value) => value === "true",
    serialize: (value) => String(value),
    setHash: "replaceState",
  },
)
